"""Synthetic demo data: ~200 reports across 3 scenarios + 8 advisories, generated relative to 'now'
so freshness badges are meaningful whenever you start the demo. Deterministic (fixed random seed)."""
import random
from datetime import timedelta

from . import db, rules, service

FLOOD_HOME = ["Water entering ground floor homes in {p}, {who} stuck on terrace.",
              "{p} homes flooded, water chest level, {who} stranded, need rescue.",
              "Flood water rising fast in {p}, {who} trapped, please send boat.",
              "{p} mein pani ghar ke andar aa gaya, {who_h} fase hain, bachao.",
              "Flood in {p}: water inside homes, {who} trapped on first floor."]
FLOOD_ROAD = ["{p} is under water, vehicles stuck, flood water knee deep.",
              "Heavy waterlogging at {p}, traffic stopped, flood water level rising.",
              "{p} flooded, water on road, vehicles stranded.",
              "{p} par pani bhar gaya hai, gaadi fase hain, traffic jam.",
              "Flood water at {p}, road submerged, vehicles stuck."]
CLAIM_OPEN = ["{p} flooded earlier but {entity} is open now, water cleared, vehicles moving.",
              "Flood water at {p} going down, {entity} is open for vehicles."]
CLAIM_CLOSED = ["{p} flood water on road, {entity} is closed, vehicles stuck.",
                "Water logging at {p}, {entity} blocked, traffic stopped."]
FIRE = ["Fire at {p}, thick smoke, {who} injured, fire brigade needed.",
        "{p} fire spreading, smoke everywhere, people hurt, send fire brigade.",
        "Blaze near {p}, flames and heavy smoke, {who} injured.",
        "{p} mein aag lag gayi hai, dhuan, ghayal log, fire brigade bulao.",
        "Transformer fire at {p}, smoke and flames, injured people."]
LANDSLIDE = ["Landslide at {p}, road blocked by debris and boulders.",
             "{p} rockfall and debris on road, route blocked, {who} trapped.",
             "Mudslide near {p}, heavy debris, road completely blocked.",
             "{p} par bhuskhalan, malba sadak par, rasta band.",
             "Boulders and debris block road at {p}, vehicles trapped after landslide."]
LS_OPEN = ["Landslide debris at {p} but {entity} is open now, vehicles passing.",
           "{p} debris cleared, {entity} is clear for traffic."]
QUAKE = ["Tremors felt, building collapse at {p}, {who} trapped under rubble.",
         "{p} building collapsed after earthquake, people trapped, rescue needed.",
         "Earthquake damage at {p}, collapsed building, injured people under rubble.",
         "{p} mein bhookamp, imarat gir gayi, log malbe mein fase hain.",
         "Collapse at {p} after quake, trapped residents, need ambulance."]
CYCLONE = ["Strong wind and storm at {p}, trees uprooted, power lines down.",
           "{p} cyclone damage, trees fallen, roof blown, power cut.",
           "Gale force wind at {p}, tree fell on road, electricity poles down.",
           "{p} mein toofan, ped gir gaye, bijli ke khambe toot gaye.",
           "Storm damage near {p}, uprooted trees blocking road, power lines down."]
EXTRAS = ["", " Urgent.", " Please hurry.", " Situation getting worse.", " Water still rising.", " Need help now.",
          " Seen it myself.", " Many people gathering.", " Road access difficult.", " No electricity here.", " Informed local police.", " Still ongoing."]
WHO = ["two elderly people", "an elderly couple", "children and elderly", "a family of four", "elderly residents"]

# name, hazard, lat, lon, newest_age_h, n, templates, severities, source mix, extras
EVENTS = [
    ("Ward 12 Riverside", "FLOOD", 26.1445, 91.7362, 0.4, 15, FLOOD_HOME, ["HIGH", "HIGH", "CRITICAL", "MEDIUM"], "mixed", {"loc_conflict": 2}),
    ("Bharalu Bridge", "FLOOD", 26.1700, 91.7200, 0.7, 11, FLOOD_ROAD, ["HIGH", "MEDIUM", "HIGH"], "mixed", {"claims": ("Bharalu Bridge", CLAIM_OPEN, 2)}),
    ("Jalukbari Circle", "FLOOD", 26.1481, 91.6622, 1.0, 8, FLOOD_ROAD, ["LOW", "MEDIUM", "LOW"], "mixed", {}),
    ("Maligaon Railway Colony", "FLOOD", 26.1530, 91.6990, 0.8, 9, FLOOD_HOME, ["MEDIUM", "HIGH"], "social", {}),
    ("Beltola Tiniali", "FLOOD", 26.1250, 91.7950, 9.0, 8, FLOOD_ROAD, ["MEDIUM", "HIGH"], "mixed", {}),
    ("Dispur Capital Complex", "FIRE", 26.1433, 91.7898, 0.3, 10, FIRE, ["CRITICAL", "HIGH", "HIGH"], "mixed", {}),
    ("Paltan Bazaar", "FIRE", 26.1810, 91.7500, 4.5, 7, FIRE, ["HIGH", "MEDIUM"], "mixed", {}),
    ("NH-21 Pandoh", "LANDSLIDE", 31.7095, 77.0145, 0.6, 15, LANDSLIDE, ["CRITICAL", "HIGH", "CRITICAL"], "mixed", {"claims": ("NH-21 Mandi-Pandoh", LS_OPEN, 2)}),
    ("Hanogi Temple", "LANDSLIDE", 31.7210, 77.0300, 0.9, 11, LANDSLIDE, ["HIGH", "CRITICAL", "MEDIUM"], "missing", {}),
    ("Kataula Route", "LANDSLIDE", 31.7350, 77.0500, 5.2, 9, LANDSLIDE, ["MEDIUM", "HIGH"], "mixed", {}),
    ("Mandi Bus Stand", "EARTHQUAKE", 31.7085, 76.9320, 1.2, 10, QUAKE, ["CRITICAL", "HIGH", "HIGH"], "mixed", {}),
    ("Milan Subway", "FLOOD", 19.0834, 72.8468, 0.5, 13, FLOOD_ROAD, ["HIGH", "MEDIUM"], "mixed", {"claims": ("Milan Subway", CLAIM_OPEN, 2)}),
    ("Andheri Subway", "FLOOD", 19.1197, 72.8464, 0.9, 11, FLOOD_ROAD, ["MEDIUM", "HIGH"], "mixed", {"claims": ("Andheri Subway", CLAIM_CLOSED, 2)}),
    ("Kurla LBS Marg", "FLOOD", 19.0728, 72.8826, 1.4, 10, FLOOD_ROAD, ["MEDIUM", "LOW", "HIGH"], "mixed", {}),
    ("Hindmata Dadar", "FLOOD", 19.0100, 72.8420, 1.1, 10, FLOOD_ROAD, ["MEDIUM", "MEDIUM", "HIGH"], "mixed", {}),
    ("Sion Hospital Area", "FLOOD", 19.0390, 72.8619, 0.6, 10, FLOOD_HOME, ["HIGH", "CRITICAL"], "mixed", {"who": ["patients needing oxygen", "elderly patients"]}),
    ("Bandra Station", "CYCLONE", 19.0544, 72.8402, 2.0, 9, CYCLONE, ["MEDIUM", "HIGH"], "mixed", {}),
    ("Santacruz East", "FLOOD", 19.0810, 72.8420, 10.0, 8, FLOOD_ROAD, ["MEDIUM", "LOW"], "mixed", {}),
    ("Worli Sea Link", "CYCLONE", 19.0176, 72.8170, 7.5, 9, CYCLONE, ["MEDIUM", "MEDIUM", "HIGH"], "mixed", {}),
]

ADVISORIES = [
    ("adv-01", "State Disaster Management Authority (ASDMA)", "FLOOD", 26.1445, 91.7362, 12,
     "Bharalu Sluice Gate & Riverside Inundation Alert",
     "Due to Brahmaputra backflow, Bharalu Sluice Gate 2 is CLOSED. Riverside Ward 12 is under mandatory evacuation.",
     [{"entity": "Bharalu Sluice Gate 2", "state": "CLOSED"}, {"entity": "Riverside Ward 12", "state": "MANDATORY_EVACUATION"}]),
    ("adv-02", "District Control Room, Kamrup Metro", "FLOOD", 26.1700, 91.7200, 6,
     "Bharalu Bridge Closure Notice", "Bharalu Bridge is CLOSED to all traffic due to flood water on the approach.",
     [{"entity": "Bharalu Bridge", "state": "CLOSED", "aliases": ["Bharalu bridge crossing"]}]),
    ("adv-03", "National Highway Authority & Himachal Police", "LANDSLIDE", 31.7084, 77.0135, 25,
     "NH-21 Mandi-Pandoh Highway Blockage Warning",
     "Massive debris flow near 6-Mile. NH-21 Mandi-Pandoh stretch is completely CLOSED. Kataula route restricted to relief convoys.",
     [{"entity": "NH-21 Mandi-Pandoh", "state": "CLOSED", "aliases": ["NH-21", "NH21"]}, {"entity": "Kataula Alternate Route", "state": "RESTRICTED_RELIEF_ONLY"}]),
    ("adv-04", "Municipal Corporation Control Center (MCGM)", "FLOOD", 19.0760, 72.8777, 15,
     "High Tide & Subway Inundation Advisory", "High tide with heavy rain. Milan Subway and Andheri Subway are CLOSED to vehicles.",
     [{"entity": "Milan Subway", "state": "CLOSED"}, {"entity": "Andheri Subway", "state": "CLOSED"}, {"entity": "Kurla LBS Marg", "state": "WATERLOGGED_SLOW_MOVING"}]),
    ("adv-05", "Mumbai Traffic Police", "FLOOD", 19.0760, 72.8777, 15, "Flyover Status",
     "Kurla Flyover is OPEN for traffic.", [{"entity": "Kurla Flyover", "state": "OPEN"}]),
    ("adv-06", "IMD Mumbai", "CYCLONE", 19.0400, 72.8500, 20, "Cyclonic Storm Warning",
     "Gale winds expected along the western suburbs.", [{"entity": "Worli Sea Link", "state": "OPEN"}]),
]


def seed_advisories(now):
    for id_, issuer, hz, la, lo, rad, title, text, assertions in ADVISORIES:
        db.insert("advisories", {"id": id_, "issuer": issuer, "hazard_type": hz, "center_lat": la, "center_lon": lo,
                                 "radius_km": rad, "issued_at": (now - timedelta(hours=20)).isoformat(),
                                 "valid_until": (now + timedelta(hours=28)).isoformat(), "title": title, "text": text,
                                 "assertions": assertions})
    # an expired advisory (ignored by the matcher)
    db.insert("advisories", {"id": "adv-07", "issuer": "District Control Room", "hazard_type": "FLOOD", "center_lat": 26.1250,
                             "center_lon": 91.7950, "radius_km": 5, "issued_at": (now - timedelta(hours=60)).isoformat(),
                             "valid_until": (now - timedelta(hours=30)).isoformat(), "title": "Expired Beltola Notice",
                             "text": "Beltola Tiniali is CLOSED.", "assertions": [{"entity": "Beltola Tiniali", "state": "CLOSED"}]})


def source_pool(kind, rng, k):
    pool = {
        "mixed": [("CITIZEN", "Phone call +91 98{:03d} 5{:04d}"), ("CITIZEN", "Helpline Desk Call #{:04d}"), ("RESPONDER", "Civil Defense Unit {}"),
                  ("MEDIA", "Local Correspondent {}"), ("OFFICIAL", "Ward Control Desk {}"), ("SOCIAL", "@reporter_{}")],
        "social": [("SOCIAL", "@reporter_{}"), ("SOCIAL", "Community WhatsApp group {}"), ("UNKNOWN", "")],
        "missing": [("UNKNOWN", ""), ("SOCIAL", "@anon_{}"), ("UNKNOWN", "anonymous")],
    }[kind]
    out = []
    for i in range(k):
        t, d = rng.choice(pool)
        out.append((t, d.format(*[rng.randint(1, 999) if "{:04d}" not in d and "{:03d}" not in d else rng.randint(100, 999)] * d.count("{")) if "{" in d else d))
    return out


def build_reports(now, rng):
    reports = []
    for name, hz, lat, lon, age, n, tpl, sevs, mix, opt in EVENTS:
        sources = source_pool(mix, rng, rng.randint(2, 5))
        for i in range(n + (1 if rng.random() < 0.5 else 0)):
            when = now - timedelta(hours=age + rng.uniform(0, 1.6) * (i / max(n, 1)) + (0.02 if i == 0 else 0))
            tmpl = rng.choice(tpl)
            entity = None
            if "claims" in opt and i < opt["claims"][2] + 1 and i > 0:
                entity, tmpls, _ = opt["claims"]
                tmpl = rng.choice(tmpls)
            who = rng.choice(opt.get("who", WHO))
            text = tmpl.format(p=name, who=who, who_h="bujurg log", entity=entity or "") + rng.choice(EXTRAS)
            loc = f"{name}{rng.choice(['', ', lane %d' % rng.randint(1, 9), ' near main road', ', behind market', ' area'])}"
            la, lo = lat + rng.uniform(-0.004, 0.004), lon + rng.uniform(-0.004, 0.004)
            st, sd = rng.choice(sources)
            r = {"description": text, "location_text": loc, "lat": round(la, 5), "lon": round(lo, 5), "source_type": st,
                 "source_detail": sd, "reported_severity": rng.choice(sevs), "reported_at": when.isoformat()}
            if "loc_conflict" in opt and 0 < i <= opt["loc_conflict"]:
                r["description"] = f"Flood water rising fast near Station Road Market area, people trapped inside shops in {name}."
            reports.append(r)
    # extra injected problems: missing coordinates, missing location, mixed junk
    reports.append({"description": "Water entering homes in Ward 12 Riverside, elderly stuck on terrace, flood rising.", "location_text": "Ward 12 Riverside",
                    "source_type": "CITIZEN", "source_detail": "Phone call +91 98765 43210", "reported_severity": "HIGH",
                    "reported_at": (now - timedelta(minutes=10)).isoformat()})
    reports.append({"description": "Heavy flood water on road, vehicles stuck, traffic stopped near the market.", "location_text": "",
                    "source_type": "SOCIAL", "source_detail": "@somebody", "reported_severity": "MEDIUM", "reported_at": (now - timedelta(minutes=30)).isoformat()})
    reports.sort(key=lambda r: r["reported_at"])
    return reports


def seed(now=None, seed=42):
    now = now or rules.now_utc()
    rng = random.Random(seed)
    db.wipe()
    seed_advisories(now)
    ok = dup = 0
    for r in build_reports(now, rng):
        try:
            service.ingest(r, now=now, log=False)
            ok += 1
        except (service.DuplicateError, service.ValidationError):
            dup += 1
    service.refresh_all(force=True)
    n_inc = db.q1("SELECT COUNT(*) c FROM incidents WHERE report_count>0")["c"]
    return {"reports": ok, "skipped": dup, "incidents": n_inc}
