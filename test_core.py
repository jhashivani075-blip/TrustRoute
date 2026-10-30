import os, sys, unittest
from datetime import timedelta
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import db, rules, seed, service
from app.geo import haversine_km


class Base(unittest.TestCase):
    def setUp(self):
        db.init(":memory:")
        self.now = rules.now_utc()
        seed.seed_advisories(self.now)

    def rep(self, **kw):
        d = {"location_text": "Ward 12 Riverside", "lat": 26.1445, "lon": 91.7362, "description": "Water entering homes, two elderly people stuck on terrace.",
             "source_type": "CITIZEN", "source_detail": "Phone 1", "reported_severity": "HIGH", "reported_at": (self.now - timedelta(minutes=5)).isoformat()}
        d.update(kw)
        return service.ingest(d, now=self.now)


class TestRules(unittest.TestCase):
    def test_haversine(self):
        self.assertAlmostEqual(haversine_km(26.1445, 91.7362, 26.1990, 91.7480), 6.2, delta=0.3)

    def test_freshness_windows(self):
        now = rules.now_utc()
        f = lambda h, hz: rules.freshness(now - timedelta(hours=h), hz, now)
        self.assertEqual((f(2, "FLOOD"), f(4, "FLOOD"), f(7, "FLOOD")), ("FRESH", "AGING", "OUTDATED"))
        self.assertEqual((f(0.5, "FIRE"), f(1.5, "FIRE"), f(3, "FIRE")), ("FRESH", "AGING", "OUTDATED"))

    def test_blueprint_score_example(self):
        mk = lambda d: {"reported_severity": "HIGH", "freshness": "FRESH", "source_type": "CITIZEN", "source_detail": d,
                        "extracted": {"life_safety_cues": ["trapped"]}}
        reps = [mk("a"), mk("b"), mk("c")]
        s = rules.priority(reps, [])
        self.assertEqual((s["score"], s["level"]), (75, "HIGH"))  # 65 urgency + 10 corroboration
        for r in reps:
            r["freshness"] = "AGING"
        s = rules.priority(reps, [])
        self.assertEqual((s["score"], s["level"]), (56, "MEDIUM"))  # 45.5 + 10, blueprint example

    def test_conflict_attention_needs_urgency(self):
        r = {"reported_severity": "LOW", "freshness": "FRESH", "source_type": "CITIZEN", "source_detail": "a", "extracted": {}}
        self.assertEqual(rules.priority([r], ["ADVISORY_CONFLICT"])["breakdown"]["conflict_attention"], 0)


class TestPipeline(Base):
    def test_duplicate_joins_cluster_and_corroboration(self):
        a = self.rep()
        b = self.rep(description="Flood water inside homes at Ward 12 Riverside, elderly trapped.", source_detail="Phone 2", lat=26.1450)
        self.assertTrue(a["is_new_incident"])
        self.assertFalse(b["is_new_incident"])
        self.assertEqual(a["incident_id"], b["incident_id"])
        inc = service.get_incident(a["incident_id"])
        self.assertEqual(inc["score_breakdown"]["corroboration"], 5)

    def test_same_source_spam_not_counted(self):
        self.rep()
        self.rep(description="Flood water inside homes at Ward 12 Riverside, elderly trapped.")
        inc = service.get_incident(service.db.q("SELECT id FROM incidents")[0]["id"])
        self.assertEqual(inc["score_breakdown"]["corroboration"], 0)

    def test_far_report_not_merged(self):
        a = self.rep()
        b = self.rep(lat=26.30, lon=91.90, location_text="Elsewhere", description="Water entering homes elsewhere, two elderly people stuck on terrace.")
        self.assertNotEqual(a["incident_id"], b["incident_id"])

    def test_old_report_not_merged_and_outdated(self):
        self.rep()
        b = self.rep(reported_at=(self.now - timedelta(hours=9)).isoformat(), description="Water entering homes in Ward 12, elderly people stuck, flood.")
        self.assertTrue(b["is_new_incident"])
        self.assertEqual(b["freshness"], "OUTDATED")
        self.assertIn("OUTDATED", [f["code"] for f in b["flags"]])

    def test_exact_duplicate_409(self):
        self.rep()
        with self.assertRaises(service.DuplicateError):
            self.rep()

    def test_gibberish_and_future(self):
        with self.assertRaises(service.ValidationError):
            self.rep(description="asdf")
        with self.assertRaises(service.ValidationError):
            self.rep(reported_at=(self.now + timedelta(hours=2)).isoformat())

    def test_missing_source_and_incomplete(self):
        r = self.rep(source_type="UNKNOWN", source_detail="", lat=None, lon=None, location_text="")
        codes = {f["code"] for f in r["flags"]}
        self.assertTrue({"MISSING_SOURCE", "INCOMPLETE"} <= codes)
        self.assertTrue(service.get_incident(r["incident_id"])["unlocated"])

    def test_phone_masked(self):
        r = self.rep(source_detail="Call +91 9876543210", description="Water entering homes, call me on 9876543210, elderly stuck.")
        self.assertNotIn("9876543210", r["report"]["description"] + r["report"]["source_detail"])

    def test_advisory_conflict_and_aligned(self):
        r = self.rep(lat=26.1700, lon=91.7200, location_text="Bharalu Bridge", description="Flood earlier but Bharalu Bridge is open now, vehicles moving.")
        self.assertIn("ADVISORY_CONFLICT", [f["code"] for f in r["flags"]])
        inc = service.get_incident(r["incident_id"])
        self.assertEqual(inc["score_breakdown"]["conflict_attention"], 10)
        r2 = self.rep(lat=26.1700, lon=91.7200, location_text="Bharalu Bridge", description="Flood water here, Bharalu Bridge is closed, vehicles stuck.", source_detail="x2")
        inc = service.get_incident(r2["incident_id"])
        self.assertTrue(any(m["result"] == "ALIGNED" for m in inc["advisory_matches"]))

    def test_location_conflict(self):
        r = self.rep(description="Water rising near Station Road Market, elderly stuck, flood.")
        self.assertIn("LOCATION_CONFLICT", [f["code"] for f in r["flags"]])

    def test_expired_advisory_ignored(self):
        r = self.rep(lat=26.1250, lon=91.7950, location_text="Beltola Tiniali", description="Flood water here but Beltola Tiniali is open, vehicles moving.")
        self.assertNotIn("ADVISORY_CONFLICT", [f["code"] for f in r["flags"]])


class TestReview(Base):
    def setUp(self):
        super().setUp()
        self.r = self.rep(lat=26.1700, lon=91.7200, location_text="Bharalu Bridge", description="Flood earlier but Bharalu Bridge is open now, vehicles moving.")
        self.iid = self.r["incident_id"]

    def test_dismiss_flag_rescores_and_audits(self):
        before = service.get_incident(self.iid)["priority_score"]
        res = service.review(self.iid, {"action": "CONFIRM", "notes": "called", "dismissed_flags": [{"code": "ADVISORY_CONFLICT", "reason": "Verified open by officer"}]})
        self.assertEqual(res["status"], "REVIEWED")
        self.assertLess(res["priority_score"], before)
        self.assertEqual(service.audit_log(self.iid)[0]["action"], "CONFIRM")
        # dismissal survives recompute
        inc = service.get_incident(self.iid)
        self.assertTrue(all(f["state"] == "DISMISSED" for f in inc["flags"] if f["code"] == "ADVISORY_CONFLICT"))

    def test_dismiss_needs_reason(self):
        with self.assertRaises(service.ValidationError):
            service.review(self.iid, {"action": "CONFIRM", "dismissed_flags": [{"code": "ADVISORY_CONFLICT", "reason": " "}]})

    def test_new_report_reopens_reviewed(self):
        service.review(self.iid, {"action": "CONFIRM"})
        self.rep(lat=26.1700, lon=91.7200, location_text="Bharalu Bridge", description="Flood water on Bharalu Bridge, vehicles stuck.", source_detail="z")
        self.assertEqual(service.get_incident(self.iid)["status"], "PENDING")

    def test_split_and_merge(self):
        b = self.rep(lat=26.1700, lon=91.7200, location_text="Bharalu Bridge", description="Flood water on Bharalu Bridge, vehicles stuck here.", source_detail="z")
        self.assertEqual(b["incident_id"], self.iid)
        res = service.review(self.iid, {"action": "SPLIT", "report_ids": [b["report_id"]]})
        new = res["new_incident_id"]
        self.assertEqual(service.get_incident(new)["report_count"], 1)
        res = service.review(new, {"action": "DISMISS_DUPLICATE", "merge_into": self.iid})
        self.assertEqual(service.get_incident(self.iid)["report_count"], 2)

    def test_resolve_hides_from_queue(self):
        service.review(self.iid, {"action": "RESOLVE"})
        self.assertEqual(service.list_incidents()["total"], 0)

    def test_edit_coordinates(self):
        res = service.review(self.iid, {"action": "EDIT", "corrected": {"lat": 26.1701, "lon": 91.7201}})
        self.assertIn("audit_id", res)


class TestSeed(unittest.TestCase):
    def test_seed_shape(self):
        db.init(":memory:")
        s = seed.seed()
        self.assertTrue(150 <= s["reports"] <= 250)
        self.assertTrue(10 <= s["incidents"] <= 30)
        codes = {f["code"] for f in db.q("SELECT code FROM flags WHERE state='ACTIVE'")}
        self.assertTrue({"ADVISORY_CONFLICT", "LOCATION_CONFLICT", "MISSING_SOURCE", "OUTDATED"} <= codes)
        self.assertTrue(service.hotspots() is not None and service.stats()["incident_clusters"] == s["incidents"])


if __name__ == "__main__":
    unittest.main(verbosity=1)
