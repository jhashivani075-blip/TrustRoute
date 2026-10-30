import json
import sqlite3
import threading

from . import config as C

LOCK = threading.RLock()
_conn = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS reports(
  id TEXT PRIMARY KEY, incident_id TEXT, reported_at TEXT, received_at TEXT, description TEXT, location_text TEXT,
  lat REAL, lon REAL, source_type TEXT, source_detail TEXT, reported_severity TEXT, text_hash TEXT UNIQUE,
  is_synthetic INTEGER DEFAULT 1, extracted TEXT, freshness TEXT, evidence_url TEXT, missing TEXT);
CREATE TABLE IF NOT EXISTS incidents(
  id TEXT PRIMARY KEY, title TEXT, hazard_type TEXT, centroid_lat REAL, centroid_lon REAL, location_name TEXT,
  first_reported_at TEXT, last_reported_at TEXT, report_count INTEGER, freshness TEXT, priority_score INTEGER,
  priority_level TEXT, score_breakdown TEXT, status TEXT DEFAULT 'PENDING', possible_duplicates TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS flags(
  id TEXT PRIMARY KEY, incident_id TEXT, report_id TEXT, report_ids TEXT, code TEXT, title TEXT, message TEXT,
  evidence TEXT, state TEXT DEFAULT 'ACTIVE', dismissed_reason TEXT, dismissed_by TEXT, dismissed_at TEXT);
CREATE TABLE IF NOT EXISTS advisories(
  id TEXT PRIMARY KEY, issuer TEXT, hazard_type TEXT, center_lat REAL, center_lon REAL, radius_km REAL,
  issued_at TEXT, valid_until TEXT, title TEXT, text TEXT, assertions TEXT);
CREATE TABLE IF NOT EXISTS reviews(  -- append-only audit log
  id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT, reviewer TEXT, action TEXT, notes TEXT,
  before TEXT, after TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_reports_inc ON reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_flags_inc ON flags(incident_id);
"""

JSON_COLS = {"extracted", "missing", "score_breakdown", "possible_duplicates", "evidence", "report_ids", "assertions", "before", "after"}


def init(path=None):
    global _conn
    with LOCK:
        if _conn:
            _conn.close()
        _conn = sqlite3.connect(path or C.DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.executescript(SCHEMA)
        _conn.commit()
    return _conn


def conn():
    return _conn or init()


def _row(r):
    d = dict(r)
    for k in JSON_COLS & d.keys():
        if isinstance(d[k], str):
            try:
                d[k] = json.loads(d[k])
            except ValueError:
                pass
    return d


def q(sql, args=()):
    return [_row(r) for r in conn().execute(sql, args).fetchall()]


def q1(sql, args=()):
    rows = q(sql, args)
    return rows[0] if rows else None


def run(sql, args=()):
    cur = conn().execute(sql, args)
    conn().commit()
    return cur


def insert(table, data):
    data = {k: (json.dumps(v) if k in JSON_COLS and not isinstance(v, str) else v) for k, v in data.items()}
    cols = ",".join(data)
    run(f"INSERT INTO {table}({cols}) VALUES({','.join('?' * len(data))})", tuple(data.values()))


def update(table, id_, data):
    data = {k: (json.dumps(v) if k in JSON_COLS and not isinstance(v, str) else v) for k, v in data.items()}
    sets = ",".join(f"{k}=?" for k in data)
    run(f"UPDATE {table} SET {sets} WHERE id=?", (*data.values(), id_))


def wipe():
    for t in ("reports", "incidents", "flags", "advisories", "reviews"):
        run(f"DELETE FROM {t}")
    run("DELETE FROM sqlite_sequence WHERE name='reviews'") if q("SELECT name FROM sqlite_master WHERE name='sqlite_sequence'") else None
