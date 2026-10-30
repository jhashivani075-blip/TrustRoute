"""Pipeline + human review logic. Everything deterministic and auditable."""
import hashlib
import re
import time
import uuid
from datetime import timedelta

from . import config as C, db, nlp, rules
from .geo import geocode, haversine_km

SOURCE_TYPES = {"CITIZEN", "RESPONDER", "MEDIA", "OFFICIAL", "SOCIAL", "UNKNOWN"}
SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
_last_refresh = 0.0


class ValidationError(ValueError):
    pass


class DuplicateError(ValueError):
    pass


class NotFound(KeyError):
    pass


# ---------- helpers ----------
def iso(d):
    return d.isoformat()


def mask_phones(text):
    def sub(m):
        digits = re.sub(r"\D", "", m.group(0))
        if len(digits) < 10:
            return m.group(0)
        return ("+91" if m.group(0).strip().startswith("+") or len(digits) == 12 else "") + "X" * (len(digits) - 4 - (2 if len(digits) == 12 else 0)) + digits[-4:]
    return re.sub(r"\+?\d[\d\s\-]{8,}\d", sub, text or "")


def looks_like_gibberish(text):
    t = (text or "").strip()
    if len(t) < 8 or len(t.split()) < 2:
        return True
    letters = sum(c.isalpha() for c in t)
    return letters / len(t) < 0.5 or len(set(t.lower())) < 5


def known_entities():
    ents = {}
    for a in db.q("SELECT assertions FROM advisories"):
        for x in a["assertions"]:
            for name in [x["entity"]] + x.get("aliases", []):
                ents[name.lower()] = x["entity"]
    return ents


def advisories():
    return db.q("SELECT * FROM advisories")


def next_incident_id():
    rows = db.q("SELECT id FROM incidents")
    n = max([int(re.sub(r"\D", "", r["id"]) or 0) for r in rows] + [0])
    return f"inc-{n + 1:03d}"


def audit(incident_id, action, notes, reviewer, before=None, after=None):
    cur = db.run("INSERT INTO reviews(incident_id,reviewer,action,notes,before,after,created_at) VALUES(?,?,?,?,?,?,?)",
                 (incident_id, reviewer, action, notes, _j(before), _j(after), iso(rules.now_utc())))
    return cur.lastrowid


def _j(v):
    import json
    return json.dumps(v) if v is not None else None


def snapshot(incident_id):
    inc = db.q1("SELECT status, priority_score, priority_level, report_count FROM incidents WHERE id=?", (incident_id,))
    if not inc:
        return None
    inc["active_flags"] = [f["code"] for f in db.q("SELECT code FROM flags WHERE incident_id=? AND state='ACTIVE'", (incident_id,))]
    return inc


# ---------- ingest ----------
def ingest(p, now=None, log=True, is_synthetic=True):
    now = now or rules.now_utc()
    desc = (p.get("description") or "").strip()
    if looks_like_gibberish(desc):
        raise ValidationError("Description is empty or unreadable; please describe what was observed.")
    desc = mask_phones(desc)
    location_text = (p.get("location_text") or "").strip()
    source_type = (p.get("source_type") or "UNKNOWN").upper()
    source_type = source_type if source_type in SOURCE_TYPES else "UNKNOWN"
    source_detail = mask_phones((p.get("source_detail") or "").strip())
    sev = (p.get("reported_severity") or "MEDIUM").upper()
    sev = sev if sev in SEVERITIES else "MEDIUM"

    missing = []
    # timestamp
    if p.get("reported_at"):
        try:
            rep_dt = rules.parse_dt(p["reported_at"])
        except ValueError:
            raise ValidationError("reported_at is not a valid ISO-8601 timestamp.")
        if rep_dt > now + timedelta(minutes=C.FUTURE_TOLERANCE_MIN):
            raise ValidationError("reported_at is in the future.")
    else:
        rep_dt = now
        missing.append("timestamp")
    # location
    lat, lon = p.get("lat"), p.get("lon")
    lat = float(lat) if lat not in (None, "") else None
    lon = float(lon) if lon not in (None, "") else None
    if lat is not None and not (-90 <= lat <= 90 and -180 <= lon <= 180 if lon is not None else False):
        raise ValidationError("lat/lon out of range.")
    if lat is None or lon is None:
        lat = lon = None
        g = geocode(location_text) if location_text else None
        if g:
            lat, lon = g["lat"], g["lon"]  # offline gazetteer lookup
        else:
            missing.append("coordinates")
    if not location_text:
        missing.append("location_text")

    h = hashlib.sha256(re.sub(r"\W+", " ", (desc + "|" + location_text).lower()).strip().encode()).hexdigest()
    if db.q1("SELECT id FROM reports WHERE text_hash=?", (h,)):
        raise DuplicateError("An identical report was already received.")

    ex = nlp.extract(desc, location_text, known_entities())
    hazard = ex["hazard_type"]
    fresh = rules.freshness(rep_dt, hazard, now)
    rid = str(uuid.uuid4())
    report = {"id": rid, "reported_at": iso(rep_dt), "received_at": iso(now), "description": desc,
              "location_text": location_text, "lat": lat, "lon": lon, "source_type": source_type,
              "source_detail": source_detail, "reported_severity": sev, "extracted": ex, "freshness": fresh,
              "missing": missing, "text_hash": h, "is_synthetic": 1 if is_synthetic else 0,
              "evidence_url": p.get("evidence_url")}

    target, possible, sim = find_cluster(report, now)
    is_new = target is None
    if is_new:
        target = next_incident_id()
        db.insert("incidents", {"id": target, "title": "", "hazard_type": hazard, "status": "PENDING",
                                "possible_duplicates": possible, "created_at": iso(now), "report_count": 0})
    report["incident_id"] = target
    db.insert("reports", report)
    prev = snapshot(target) if not is_new else None
    reopened = False
    if not is_new and prev["status"] in ("REVIEWED", "NEEDS_VERIFICATION"):
        db.update("incidents", target, {"status": "PENDING"})  # new information -> back to the queue
        reopened = True
    recompute(target, now)
    inc = get_incident(target, recompute_now=False)
    if log:
        note = (f"Opened new cluster {target}" if is_new else
                f"Grouped report with {target} (similarity {sim:.2f})") + (" and returned it to the pending queue" if reopened else "")
        audit(target, "EDIT", note, "Automated Ingest Pipeline", prev, snapshot(target))
    report_flags = [f for f in inc["flags"] if f["state"] == "ACTIVE" and (not f["report_ids"] or rid in f["report_ids"])]
    explanation = (f"Created new cluster {target}. " if is_new else f"Grouped with existing cluster {target} (text similarity {sim:.2f}). ") + \
        f"Suggested priority {inc['priority_score']} ({inc['priority_level']}), computed deterministically; see score breakdown."
    saved = db.q1("SELECT * FROM reports WHERE id=?", (rid,))
    return {"report_id": rid, "incident_id": target, "is_new_incident": is_new, "freshness": fresh,
            "priority_score": inc["priority_score"], "priority_level": inc["priority_level"],
            "flags": report_flags, "extraction": ex, "explanation": explanation,
            "report": saved, "incident": inc, "possible_duplicates": possible if is_new else []}


def find_cluster(report, now):
    """Blueprint 11.1: same hazard + similarity + distance + time. Rules decide, similarity only suggests."""
    best, possible = None, []
    hazard = report["extracted"]["hazard_type"]
    rdt = rules.parse_dt(report["reported_at"])
    for inc in db.q("SELECT * FROM incidents WHERE status != 'RESOLVED' AND report_count > 0"):
        if inc["hazard_type"] != hazard:
            continue
        if abs((rdt - rules.parse_dt(inc["last_reported_at"])).total_seconds()) / 3600 > C.MERGE_WINDOW_HOURS:
            continue
        members = db.q("SELECT description FROM reports WHERE incident_id=?", (inc["id"],))
        sim = max((nlp.similarity(report["description"], m["description"]) for m in members), default=0)
        have_coords = report["lat"] is not None and inc["centroid_lat"] is not None
        dist = haversine_km(report["lat"], report["lon"], inc["centroid_lat"], inc["centroid_lon"]) if have_coords else None
        if have_coords:
            if dist <= C.MERGE_RADIUS_KM and sim >= C.SIM_MERGE:
                if not best or sim > best[1]:
                    best = (inc["id"], sim)
            elif dist <= C.MERGE_RADIUS_KM and sim >= C.SIM_POSSIBLE:
                possible.append({"incident_id": inc["id"], "similarity": round(sim, 2)})
        elif sim >= C.SIM_MERGE_NO_COORDS:
            if not best or sim > best[1]:
                best = (inc["id"], sim)
        elif sim >= C.SIM_POSSIBLE:
            possible.append({"incident_id": inc["id"], "similarity": round(sim, 2)})
    if best:
        return best[0], [], best[1]
    possible.sort(key=lambda x: -x["similarity"])
    return None, possible[:3], 0.0


# ---------- recompute one incident (freshness, flags, score) ----------
def recompute(incident_id, now=None):
    now = now or rules.now_utc()
    reports = db.q("SELECT * FROM reports WHERE incident_id=? ORDER BY reported_at DESC", (incident_id,))
    if not reports:
        db.run("DELETE FROM flags WHERE incident_id=?", (incident_id,))
        db.run("DELETE FROM incidents WHERE id=?", (incident_id,))
        return
    for r in reports:  # freshness moves with the clock
        f = rules.freshness(r["reported_at"], r["extracted"]["hazard_type"], now)
        if f != r["freshness"]:
            db.update("reports", r["id"], {"freshness": f})
            r["freshness"] = f
    hazards = [r["extracted"]["hazard_type"] for r in reports if r["extracted"]["hazard_type"] != "UNKNOWN"]
    hazard = max(set(hazards), key=hazards.count) if hazards else "UNKNOWN"
    located = [r for r in reports if r["lat"] is not None]
    c_lat = sum(r["lat"] for r in located) / len(located) if located else None
    c_lon = sum(r["lon"] for r in located) / len(located) if located else None

    flags, matches, notes = rules.compute_flags(incident_id, reports, advisories(), now)
    old = {f["id"]: f for f in db.q("SELECT * FROM flags WHERE incident_id=?", (incident_id,))}
    db.run("DELETE FROM flags WHERE incident_id=?", (incident_id,))
    for f in flags:
        o = old.get(f["id"])  # dismissed state survives recompute
        f.update({"state": "DISMISSED", "dismissed_reason": o["dismissed_reason"], "dismissed_by": o["dismissed_by"],
                  "dismissed_at": o["dismissed_at"]} if o and o["state"] == "DISMISSED" else {"state": "ACTIVE"})
        db.insert("flags", f)
    active = [f["code"] for f in flags if f["state"] == "ACTIVE"]
    score = rules.priority(reports, active)
    top = max(reports, key=lambda r: (C.SEVERITY_POINTS.get(r["reported_severity"], 0), r["reported_at"]))
    loc_name = next((r["location_text"] for r in reports if r["location_text"]), "Unlocated")
    title = f"{hazard.title()} reports – {top['location_text'] or loc_name}"
    db.update("incidents", incident_id, {
        "title": title, "hazard_type": hazard, "centroid_lat": c_lat, "centroid_lon": c_lon, "location_name": loc_name,
        "first_reported_at": min(r["reported_at"] for r in reports), "last_reported_at": max(r["reported_at"] for r in reports),
        "report_count": len(reports), "freshness": score["freshness"], "priority_score": score["score"],
        "priority_level": score["level"], "score_breakdown": {**score["breakdown"], "advisory_matches": matches, "notes": notes}})


def refresh_all(force=False):
    global _last_refresh
    if not force and time.time() - _last_refresh < C.REFRESH_TTL_SECONDS:
        return
    _last_refresh = time.time()
    now = rules.now_utc()
    for i in db.q("SELECT id FROM incidents WHERE status != 'RESOLVED'"):
        recompute(i["id"], now)


# ---------- read models ----------
def _shape(inc, full):
    sb = inc.get("score_breakdown") or {}
    flags = db.q("SELECT * FROM flags WHERE incident_id=? ORDER BY code, id", (inc["id"],))
    inc["incident_id"] = inc["id"]
    inc["lat"], inc["lon"] = inc["centroid_lat"], inc["centroid_lon"]
    inc["unlocated"] = inc["centroid_lat"] is None
    inc["flags"] = flags
    inc["flag_codes"] = sorted({f["code"] for f in flags if f["state"] == "ACTIVE"})
    inc["advisory_matches"] = sb.pop("advisory_matches", [])
    inc["notes"] = sb.pop("notes", [])
    inc["has_advisory_conflict"] = any(m["result"] == "CONFLICT" for m in inc["advisory_matches"]) and "ADVISORY_CONFLICT" in inc["flag_codes"]
    inc["score_breakdown"] = sb
    if full:
        inc["reports"] = db.q("SELECT * FROM reports WHERE incident_id=? ORDER BY reported_at DESC", (inc["id"],))
        for r in inc["reports"]:
            r["flags"] = [f for f in flags if r["id"] in (f["report_ids"] or [])]
        used = {m["advisory_id"] for m in inc["advisory_matches"]}
        advs = advisories()
        covering = [a for a in advs if rules.advisory_active(a) and inc["centroid_lat"] is not None
                    and rules.advisory_covers(a, inc["centroid_lat"], inc["centroid_lon"], inc["hazard_type"])]
        inc["advisories"] = covering or [a for a in advs if a["id"] in used]
    return inc


def get_incident(incident_id, recompute_now=True):
    inc = db.q1("SELECT * FROM incidents WHERE id=?", (incident_id,))
    if not inc:
        raise NotFound(incident_id)
    if recompute_now and inc["status"] != "RESOLVED":
        recompute(incident_id)
        inc = db.q1("SELECT * FROM incidents WHERE id=?", (incident_id,))
    return _shape(inc, full=True)


def list_incidents(level=None, status=None, hazard=None, flag=None, freshness=None, q=None,
                   limit=100, offset=0, unlocated=None, include_resolved=False, include_reports=False):
    refresh_all()
    rows = db.q("SELECT * FROM incidents WHERE report_count > 0 ORDER BY priority_score DESC, last_reported_at DESC")
    items = []
    for inc in rows:
        if status:
            if inc["status"] != status:
                continue
        elif inc["status"] == "RESOLVED" and not include_resolved:
            continue
        if level and inc["priority_level"] != level.upper():
            continue
        if hazard and inc["hazard_type"] != hazard.upper():
            continue
        if freshness and inc["freshness"] != freshness.upper():
            continue
        if unlocated is not None and (inc["centroid_lat"] is None) != unlocated:
            continue
        shaped = _shape(inc, full=include_reports)
        if flag and flag.upper() not in shaped["flag_codes"]:
            continue
        if q:
            ql = q.lower()
            if ql not in (inc["title"] + " " + (inc["location_name"] or "") + " " + inc["id"]).lower():
                continue
        items.append(shaped)
    total = len(items)
    return {"total": total, "items": items[offset: offset + limit]}


# ---------- human review ----------
def _move_reports(report_ids, target):
    for rid in report_ids:
        db.update("reports", rid, {"incident_id": target})


def review(incident_id, p, reviewer=None):
    reviewer = reviewer or p.get("reviewer") or C.DEFAULT_REVIEWER
    action = (p.get("action") or "").upper()
    if action not in {"CONFIRM", "DISMISS_DUPLICATE", "MERGE", "SPLIT", "NEEDS_VERIFICATION", "RESOLVE", "EDIT", "DISMISS_FLAG"}:
        raise ValidationError(f"Unknown action '{action}'.")
    inc = db.q1("SELECT * FROM incidents WHERE id=?", (incident_id,))
    if not inc:
        raise NotFound(incident_id)
    before = snapshot(incident_id)
    notes = p.get("notes") or f"Action {action} by {reviewer}"
    extra = {}

    # flag dismissals (need a reason)
    for d in p.get("dismissed_flags") or []:
        if not (d.get("reason") or "").strip():
            raise ValidationError("A reason is required to dismiss a flag.")
        _dismiss(incident_id, d.get("flag_id"), d.get("code"), d["reason"].strip(), reviewer)
    if action == "DISMISS_FLAG" and not p.get("dismissed_flags"):
        raise ValidationError("dismissed_flags is required for DISMISS_FLAG.")

    if action == "CONFIRM":
        db.update("incidents", incident_id, {"status": "REVIEWED"})
    elif action == "NEEDS_VERIFICATION":
        db.update("incidents", incident_id, {"status": "NEEDS_VERIFICATION"})
    elif action == "RESOLVE":
        db.update("incidents", incident_id, {"status": "RESOLVED"})
    elif action in ("DISMISS_DUPLICATE", "MERGE"):
        target = p.get("merge_into")
        if not target or target == incident_id or not db.q1("SELECT id FROM incidents WHERE id=?", (target,)):
            raise ValidationError("merge_into must be another existing incident id.")
        _move_reports([r["id"] for r in db.q("SELECT id FROM reports WHERE incident_id=?", (incident_id,))], target)
        recompute(incident_id)  # empties + removes the source incident
        recompute(target)
        extra["merged_into"] = target
    elif action == "SPLIT":
        ids = p.get("report_ids") or _pick_outlier(incident_id)
        members = {r["id"] for r in db.q("SELECT id FROM reports WHERE incident_id=?", (incident_id,))}
        if not set(ids) <= members or len(ids) >= len(members):
            raise ValidationError("report_ids must be a non-empty subset that leaves at least one report behind.")
        new_id = next_incident_id()
        db.insert("incidents", {"id": new_id, "title": "", "hazard_type": inc["hazard_type"], "status": "PENDING",
                                "created_at": iso(rules.now_utc()), "report_count": 0})
        _move_reports(ids, new_id)
        db.update("incidents", incident_id, {"status": "PENDING"})
        recompute(incident_id)
        recompute(new_id)
        extra["new_incident_id"] = new_id
        notes += f" (split off {len(ids)} report(s) into {new_id})"
    elif action == "EDIT":
        c = p.get("corrected") or {}
        fields = {k: c[k] for k in ("lat", "lon", "location_text", "reported_severity") if k in c}
        if not fields:
            raise ValidationError("corrected must contain lat/lon/location_text/reported_severity.")
        if ("lat" in fields) != ("lon" in fields):
            raise ValidationError("Provide lat and lon together.")
        ids = p.get("report_ids") or [r["id"] for r in db.q("SELECT id FROM reports WHERE incident_id=?", (incident_id,))]
        for rid in ids:
            rep = db.q1("SELECT missing FROM reports WHERE id=? AND incident_id=?", (rid, incident_id))
            if rep:
                if "lat" in fields:
                    rep["missing"] = [m for m in rep["missing"] if m != "coordinates"]
                if "location_text" in fields:
                    rep["missing"] = [m for m in rep["missing"] if m != "location_text"]
                db.update("reports", rid, {**fields, "missing": rep["missing"]})

    if db.q1("SELECT id FROM incidents WHERE id=?", (incident_id,)):
        recompute(incident_id)  # flags + score re-derived deterministically from corrected data
    after = snapshot(incident_id)
    aid = audit(incident_id, action, notes, reviewer, before, after)
    cur = after or {"status": "MERGED", "priority_score": 0}
    return {"incident_id": incident_id, "status": cur["status"], "priority_score": cur["priority_score"],
            "priority_level": cur.get("priority_level"), "audit_id": aid, **extra}


def _pick_outlier(incident_id):
    reps = db.q("SELECT id, description FROM reports WHERE incident_id=?", (incident_id,))
    if len(reps) < 2:
        raise ValidationError("Cannot split an incident with a single report.")
    avg = {r["id"]: sum(nlp.similarity(r["description"], o["description"]) for o in reps if o["id"] != r["id"]) / (len(reps) - 1) for r in reps}
    return [min(avg, key=avg.get)]


def _dismiss(incident_id, flag_id, code, reason, reviewer):
    rows = db.q("SELECT * FROM flags WHERE incident_id=? AND state='ACTIVE' AND (id=? OR code=?)", (incident_id, flag_id, code))
    if not rows:
        raise NotFound(f"no active flag {flag_id or code}")
    for f in rows:
        db.update("flags", f["id"], {"state": "DISMISSED", "dismissed_reason": reason, "dismissed_by": reviewer,
                                      "dismissed_at": iso(rules.now_utc())})


def dismiss_flag(incident_id, flag_id, reason, reviewer=None):
    reviewer = reviewer or C.DEFAULT_REVIEWER
    if not (reason or "").strip():
        raise ValidationError("A reason is required to dismiss a flag.")
    if not db.q1("SELECT id FROM incidents WHERE id=?", (incident_id,)):
        raise NotFound(incident_id)
    before = snapshot(incident_id)
    flag = db.q1("SELECT code, title FROM flags WHERE id=? AND incident_id=?", (flag_id, incident_id))
    _dismiss(incident_id, flag_id, None, reason.strip(), reviewer)
    recompute(incident_id)
    aid = audit(incident_id, "DISMISS_FLAG", f'Dismissed flag "{flag["title"]}" ({flag["code"]}). Reason: {reason.strip()}', reviewer, before, snapshot(incident_id))
    return {"incident_id": incident_id, "audit_id": aid, "flag_id": flag_id, "state": "DISMISSED"}


# ---------- stats, audit, hotspots ----------
def audit_log(incident_id=None, limit=200):
    rows = db.q("SELECT * FROM reviews" + (" WHERE incident_id=?" if incident_id else "") + " ORDER BY id DESC LIMIT ?",
                (incident_id, limit) if incident_id else (limit,))
    for r in rows:
        r["details"] = {"before": r.get("before"), "after": r.get("after")}
    return rows


def stats():
    refresh_all()
    incs = db.q("SELECT * FROM incidents WHERE report_count > 0 AND status != 'RESOLVED'")
    flags = db.q("SELECT f.code, f.incident_id FROM flags f JOIN incidents i ON i.id=f.incident_id WHERE f.state='ACTIVE' AND i.status != 'RESOLVED'")
    reports = db.q("SELECT reported_at FROM reports")
    total_reports = len(reports)
    buckets = {}
    for r in reports:
        k = rules.parse_dt(r["reported_at"]).astimezone(rules.now_utc().tzinfo).strftime("%Y-%m-%d %H:00")
        buckets[k] = buckets.get(k, 0) + 1
    by_code = {}
    for f in flags:
        by_code[f["code"]] = by_code.get(f["code"], 0) + 1
    return {
        "incident_clusters": len(incs),
        "high_priority_pending": sum(1 for i in incs if i["priority_level"] == "HIGH" and i["status"] in ("PENDING", "NEEDS_VERIFICATION")),
        "reports_flagged_for_review": len({f["incident_id"] for f in flags}),
        "duplicates_grouped": total_reports - len(incs) if total_reports >= len(incs) else 0,
        "total_reports": total_reports,
        "reports_over_time": [{"bucket": k, "count": v} for k, v in sorted(buckets.items())],
        "flags_by_type": [{"code": k, "count": v} for k, v in sorted(by_code.items())],
        "by_priority": {lvl: sum(1 for i in incs if i["priority_level"] == lvl) for lvl in ("HIGH", "MEDIUM", "LOW")},
    }


def hotspots():
    """Stretch goal: Count(B) >= 3 and Count(B) > 2*Count(A) per ~5 km cell and hazard."""
    now = rules.now_utc()
    w = timedelta(hours=C.HOTSPOT_WINDOW_HOURS)
    cells = {}
    for inc in db.q("SELECT id, hazard_type, centroid_lat, centroid_lon FROM incidents WHERE report_count>0 AND centroid_lat IS NOT NULL"):
        rs = db.q("SELECT reported_at FROM reports WHERE incident_id=?", (inc["id"],))
        first = min(rules.parse_dt(r["reported_at"]) for r in rs)  # incident "appears" at its first report
        key = (inc["hazard_type"], int(inc["centroid_lat"] // C.HOTSPOT_CELL_DEG), int(inc["centroid_lon"] // C.HOTSPOT_CELL_DEG))
        c = cells.setdefault(key, {"A": set(), "B": set()})
        if now - w <= first <= now:
            c["B"].add(inc["id"])
        elif now - 2 * w <= first < now - w:
            c["A"].add(inc["id"])
    out = []
    for (hz, la, lo), c in cells.items():
        a, b = len(c["A"]), len(c["B"])
        if b >= C.HOTSPOT_MIN_COUNT and b > a * 2:
            out.append({"hazard_type": hz, "lat": (la + .5) * C.HOTSPOT_CELL_DEG, "lon": (lo + .5) * C.HOTSPOT_CELL_DEG,
                        "count_previous": a, "count_latest": b, "incident_ids": sorted(c["B"])})
    return out
