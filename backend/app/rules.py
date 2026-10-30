"""Pure, deterministic rule functions: freshness, flags, advisory matching, priority score."""
import hashlib
from datetime import datetime, timezone

from . import config as C
from .geo import find_places, haversine_km


def parse_dt(s):
    if isinstance(s, datetime):
        d = s
    else:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    if d.tzinfo is None:  # naive -> assume IST (project region)
        from datetime import timedelta
        d = d.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
    return d


def now_utc():
    return datetime.now(timezone.utc)


# ---------- freshness ----------
def freshness(reported_at, hazard, now=None):
    now = now or now_utc()
    age_h = max(0.0, (now - parse_dt(reported_at)).total_seconds() / 3600)
    fresh_max, aging_max = C.FRESHNESS_WINDOWS.get(hazard, C.FRESHNESS_WINDOWS["UNKNOWN"])
    return "FRESH" if age_h <= fresh_max else "AGING" if age_h <= aging_max else "OUTDATED"


def best_freshness(values):
    rank = {"FRESH": 3, "AGING": 2, "OUTDATED": 1}
    return max(values, key=lambda v: rank.get(v, 1)) if values else "FRESH"


# ---------- advisories ----------
def advisory_active(adv, now=None):
    now = now or now_utc()
    return parse_dt(adv["issued_at"]) <= now <= parse_dt(adv["valid_until"])


def advisory_covers(adv, lat, lon, hazard):
    if lat is None or lon is None:
        return False
    if adv["hazard_type"] not in (hazard, "UNKNOWN") and hazard != "UNKNOWN":
        return False
    return haversine_km(lat, lon, adv["center_lat"], adv["center_lon"]) <= adv["radius_km"]


def assertion_class(state):
    s = (state or "").upper()
    if s.startswith(("CLOSED", "IMPASSABLE", "BLOCKED")):
        return "CLOSED"
    if s == "OPEN":
        return "OPEN"
    return None  # anything else: cannot compare -> no flag (blueprint: no guessing)


def match_advisories(report, advisories, now=None):
    """-> list of {advisory_id, entity, advisory_state, report_state, result: CONFLICT|ALIGNED}"""
    out = []
    ex = report.get("extracted") or {}
    hazard = ex.get("hazard_type", "UNKNOWN")
    for adv in advisories:
        if not advisory_active(adv, now) or not advisory_covers(adv, report.get("lat"), report.get("lon"), hazard):
            continue
        for a in adv.get("assertions", []):
            acls = assertion_class(a.get("state"))
            if not acls:
                continue
            for c in ex.get("claims", []):
                if c["entity"].lower() == a["entity"].lower() and c["state"] in ("OPEN", "CLOSED"):
                    out.append({"advisory_id": adv["id"], "issuer": adv["issuer"], "advisory_text": adv["text"],
                                "entity": a["entity"], "advisory_state": a["state"], "report_state": c["state"],
                                "report_id": report["id"], "snippet": c.get("snippet", report.get("description", "")[:160]),
                                "result": "ALIGNED" if c["state"] == acls else "CONFLICT"})
    return out


# ---------- flags ----------
def _fid(incident_id, code, report_id, extra=""):
    return "flg-" + hashlib.sha1(f"{incident_id}|{code}|{report_id}|{extra}".encode()).hexdigest()[:8]


def compute_flags(incident_id, reports, advisories, now=None):
    """Returns (flags, advisory_matches, notes). Wording is always 'needs review' - never true/false."""
    now = now or now_utc()
    flags, matches, notes = [], [], []

    def add(code, title, message, evidence, report_id=None, report_ids=None, extra=""):
        flags.append({"id": _fid(incident_id, code, report_id, extra), "incident_id": incident_id, "report_id": report_id,
                      "report_ids": report_ids or ([report_id] if report_id else []), "code": code, "title": title,
                      "message": message, "evidence": evidence})

    # MISSING_SOURCE (one aggregated flag per incident)
    ms = [r for r in reports if r["source_type"] == "UNKNOWN" or not (r.get("source_detail") or "").strip()]
    if ms:
        add("MISSING_SOURCE", "Missing or Unattributed Source",
            f"{len(ms)} report(s) have no usable source attribution. Needs review.",
            [f"{r['id']}: type={r['source_type']}, detail=\"{r.get('source_detail') or ''}\"" for r in ms[:5]],
            report_ids=[r["id"] for r in ms])

    # LOW_ATTRIBUTION
    types = {r["source_type"] for r in reports}
    if reports and types <= {"SOCIAL", "UNKNOWN"}:
        add("LOW_ATTRIBUTION", "Low Attribution Cluster",
            "Every source in this cluster is social or unknown; no citizen, responder, media or official source yet. Needs review.",
            sorted({f"{r['source_type']}: {r.get('source_detail') or '-'}" for r in reports})[:6])

    # INCOMPLETE (aggregated)
    inc = [r for r in reports if r.get("missing")]
    if inc:
        add("INCOMPLETE", "Incomplete Report Data",
            f"{len(inc)} report(s) are missing fields. Needs review.",
            [f"{r['id']}: missing {', '.join(r['missing'])}" for r in inc[:5]], report_ids=[r["id"] for r in inc])

    # LOCATION_CONFLICT (place in text vs pin)
    for r in reports:
        if r.get("lat") is None:
            continue
        worst = None
        for p in find_places((r.get("description") or "") + " . " + (r.get("location_text") or "")):
            d = haversine_km(r["lat"], r["lon"], p["lat"], p["lon"])
            if d > C.LOCATION_CONFLICT_KM and (worst is None or d > worst[1]):
                worst = (p, d)
        if worst:
            p, d = worst
            add("LOCATION_CONFLICT", "Geographic Discrepancy",
                f"Text mentions '{p['name']}' but the pin is {d:.1f} km away. Needs review.",
                [p["name"], r.get("location_text") or "pin location", f"Distance: {d:.1f}km"], report_id=r["id"])
    # LOCATION_CONFLICT (cluster spread)
    pts = [(r["lat"], r["lon"]) for r in reports if r.get("lat") is not None]
    spread = max((haversine_km(*a, *b) for i, a in enumerate(pts) for b in pts[i + 1:]), default=0)
    if spread > C.CLUSTER_SPREAD_KM:
        add("LOCATION_CONFLICT", "Cluster Members Far Apart",
            f"Reports in this cluster are spread over {spread:.1f} km. Needs review.",
            [f"Max spread: {spread:.1f}km"], extra="spread")

    # ADVISORY_CONFLICT / aligned
    for r in reports:
        for m in match_advisories(r, advisories, now):
            matches.append(m)
            if m["result"] == "CONFLICT":
                add("ADVISORY_CONFLICT", "Direct Advisory Contradiction",
                    f"Report says '{m['entity']}' is {m['report_state']}; advisory lists it as {m['advisory_state']}. "
                    "Both are shown side by side; needs review.",
                    [f"Report claim: \"{m['snippet']}\"", f"Advisory {m['advisory_id']} ({m['issuer']}): \"{m['advisory_text']}\""],
                    report_id=r["id"], extra=m["entity"])

    # OUTDATED (all reports in the cluster are outdated)
    if reports and all(r.get("freshness") == "OUTDATED" for r in reports):
        newest = max(reports, key=lambda r: parse_dt(r["reported_at"]))
        age = (now - parse_dt(newest["reported_at"])).total_seconds() / 3600
        hz = (newest.get("extracted") or {}).get("hazard_type", "UNKNOWN")
        win = C.FRESHNESS_WINDOWS.get(hz, C.FRESHNESS_WINDOWS["UNKNOWN"])[1]
        add("OUTDATED", "Information Staleness",
            f"Newest report is {age:.1f} h old; window for {hz} is {win} h. Needs review.",
            [f"Reported at: {newest['reported_at']}", f"Window used: {win} h ({hz})"])

    # SEVERITY_MISMATCH
    ranks = [C.SEVERITY_RANK.get(r["reported_severity"], 2) for r in reports]
    if ranks and max(ranks) - min(ranks) >= C.SEVERITY_MISMATCH_LEVELS:
        add("SEVERITY_MISMATCH", "Severity Disagreement",
            "Reports in this cluster disagree on severity by two or more levels. Needs review.",
            [f"{r['id']}: {r['reported_severity']}" for r in reports[:6]])

    # NO_ADVISORY_COVER -> informational note (not a flag)
    hz = reports[0].get("extracted", {}).get("hazard_type", "UNKNOWN") if reports else "UNKNOWN"
    located = [r for r in reports if r.get("lat") is not None]
    if located and not any(advisory_active(a, now) and advisory_covers(a, located[0]["lat"], located[0]["lon"], hz) for a in advisories):
        notes.append({"code": "NO_ADVISORY_COVER", "message": "No active advisory covers this area and hazard.",
                      "evidence": [f"Advisories checked: {len(advisories)}"]})
    return flags, matches, notes


# ---------- priority ----------
def priority(reports, active_flag_codes):
    """Priority = min(100, Urgency x FreshnessFactor + Corroboration + ConflictAttention)."""
    if not reports:
        return {"score": 0, "level": "LOW", "freshness": "FRESH",
                "breakdown": {"urgency": 0, "freshness_factor": 1.0, "corroboration": 0, "conflict_attention": 0, "total": 0}}
    base = max(C.SEVERITY_POINTS.get(r["reported_severity"], 30) for r in reports)
    cues = set()
    for r in reports:
        cues.update((r.get("extracted") or {}).get("life_safety_cues", []))
    cue_bonus = min(C.CUE_CAP, sum(C.CUE_POINTS.get(c, 0) for c in cues))
    urgency = min(100, base + cue_bonus)
    fresh = best_freshness([r.get("freshness", "FRESH") for r in reports])
    ff = C.FRESHNESS_FACTOR[fresh]
    sources = {(r["source_type"], (r.get("source_detail") or "").strip().lower()) for r in reports}
    corro = min(C.CORROBORATION_CAP, max(0, len(sources) - 1) * C.CORROBORATION_PER_SOURCE)
    conflict = {"ADVISORY_CONFLICT", "LOCATION_CONFLICT"} & set(active_flag_codes)
    ca = C.CONFLICT_ATTENTION_POINTS if conflict and urgency >= C.CONFLICT_ATTENTION_MIN_URGENCY else 0
    total = min(100, round(urgency * ff + corro + ca))
    level = "HIGH" if total >= C.LEVEL_HIGH else "MEDIUM" if total >= C.LEVEL_MEDIUM else "LOW"
    return {"score": total, "level": level, "freshness": fresh, "breakdown": {
        "urgency": urgency, "freshness_factor": ff, "corroboration": corro, "conflict_attention": ca, "total": total,
        "details": {"base_severity": base, "safety_cue_bonus": cue_bonus, "life_safety_cues": sorted(cues),
                    "independent_sources": len(sources),
                    "conflict_reason": "Active advisory/location conflict on an urgent incident" if ca else None}}}
