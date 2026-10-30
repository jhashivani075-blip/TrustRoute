"""TrustRoute API. Run:  uvicorn app.main:app --reload --port 8000   (Swagger UI at /docs)"""
import csv
import functools
import io
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import config as C, db, seed as seeder, service
from .service import DuplicateError, NotFound, ValidationError

app = FastAPI(title="TrustRoute API", version="1.0",
              description="Organizes disaster reports, groups duplicates, flags items for human review. Never declares truth.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def startup():
    db.init()
    if C.AUTO_SEED and not db.q("SELECT id FROM incidents LIMIT 1"):
        print("Seeded:", seeder.seed())


@app.exception_handler(ValidationError)
async def _400(_, e):
    return JSONResponse(status_code=400, content={"detail": str(e)})


@app.exception_handler(DuplicateError)
async def _409(_, e):
    return JSONResponse(status_code=409, content={"detail": str(e)})


@app.exception_handler(NotFound)
async def _404(_, e):
    return JSONResponse(status_code=404, content={"detail": f"Not found: {e}"})


def locked(fn):
    """Single writer at a time (SQLite + threadpool)."""
    @functools.wraps(fn)
    def wrapper(*a, **k):
        with db.LOCK:
            return fn(*a, **k)
    return wrapper


# ---------- models ----------
class ReportIn(BaseModel):
    location_text: Optional[str] = ""
    lat: Optional[float] = None
    lon: Optional[float] = None
    description: str = ""
    reported_at: Optional[str] = None
    source_type: Optional[str] = "UNKNOWN"
    source_detail: Optional[str] = ""
    reported_severity: Optional[str] = "MEDIUM"
    evidence_url: Optional[str] = None


class DismissedFlag(BaseModel):
    code: Optional[str] = None
    flag_id: Optional[str] = None
    reason: str = ""


class ReviewIn(BaseModel):
    action: str
    notes: Optional[str] = ""
    reviewer: Optional[str] = None
    dismissed_flags: list[DismissedFlag] = Field(default_factory=list)
    corrected: Optional[dict] = None
    report_ids: Optional[list[str]] = None   # SPLIT / EDIT scope
    merge_into: Optional[str] = None         # DISMISS_DUPLICATE / MERGE target


class DismissIn(BaseModel):
    reason: str
    reviewer: Optional[str] = None


# ---------- reports ----------
@app.post("/api/v1/reports")
@locked
def create_report(body: ReportIn):
    return service.ingest(body.model_dump(), is_synthetic=True)


CSV_FIELDS = ["location_text", "lat", "lon", "description", "reported_severity", "source_type", "source_detail", "reported_at"]


def parse_csv(text):
    rows = list(csv.reader(io.StringIO(text.strip())))
    if not rows:
        return []
    if "description" in [c.strip().lower() for c in rows[0]]:  # header row
        header = [c.strip().lower() for c in rows[0]]
        return [dict(zip(header, r)) for r in rows[1:] if any(c.strip() for c in r)]
    # header-less: location,lat,lon,description,severity (format used by the frontend modal)
    return [dict(zip(CSV_FIELDS, r)) for r in rows if any(c.strip() for c in r)]


@app.post("/api/v1/reports/bulk")
async def bulk_upload(request: Request):
    """Accepts multipart file upload (field 'file'), JSON {csv_text} / {reports:[...]}, or raw CSV text."""
    ctype = request.headers.get("content-type", "")
    if "multipart" in ctype:
        form = await request.form()
        up = form.get("file")
        if up is None:
            raise ValidationError("multipart upload needs a 'file' field")
        rows = parse_csv((await up.read()).decode("utf-8-sig"))
    elif "json" in ctype:
        data = await request.json()
        rows = data if isinstance(data, list) else data.get("reports") or parse_csv(data.get("csv_text", ""))
    else:
        rows = parse_csv((await request.body()).decode("utf-8-sig"))
    with db.LOCK:
        return _process_rows(rows)


def _process_rows(rows):
    out = {"received": len(rows), "created": 0, "joined_existing": 0, "new_incidents": 0, "duplicates_rejected": 0, "errors": [], "results": []}
    for i, row in enumerate(rows, start=1):
        try:
            res = service.ingest({k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}, is_synthetic=True)
            out["created"] += 1
            out["new_incidents" if res["is_new_incident"] else "joined_existing"] += 1
            out["results"].append({"row": i, "report_id": res["report_id"], "incident_id": res["incident_id"], "priority_level": res["priority_level"]})
        except DuplicateError:
            out["duplicates_rejected"] += 1
        except (ValidationError, ValueError) as e:
            out["errors"].append({"row": i, "error": str(e)})
    return out


@app.get("/api/v1/reports")
def list_reports(incident_id: Optional[str] = None, limit: int = 200, offset: int = 0):
    rows = db.q("SELECT * FROM reports" + (" WHERE incident_id=?" if incident_id else "") + " ORDER BY reported_at DESC LIMIT ? OFFSET ?",
                (incident_id, limit, offset) if incident_id else (limit, offset))
    return {"total": len(rows), "items": rows}


# ---------- incidents ----------
@app.get("/api/v1/incidents")
@locked
def get_incidents(level: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None,
                  hazard: Optional[str] = None, flag: Optional[str] = None, freshness: Optional[str] = None,
                  q: Optional[str] = None, unlocated: Optional[bool] = None, include_reports: bool = False,
                  include_resolved: bool = False, limit: int = 100, offset: int = 0):
    return service.list_incidents(level or priority, status, hazard, flag, freshness, q, limit, offset,
                                  unlocated, include_resolved, include_reports)


@app.get("/api/v1/incidents/{incident_id}")
@locked
def get_incident(incident_id: str):
    return service.get_incident(incident_id)


@app.post("/api/v1/incidents/{incident_id}/review")
@locked
def review_incident(incident_id: str, body: ReviewIn, request: Request):
    payload = body.model_dump()
    payload["dismissed_flags"] = [d for d in payload["dismissed_flags"]]
    return service.review(incident_id, payload, reviewer=request.headers.get("x-reviewer") or body.reviewer)


@app.post("/api/v1/incidents/{incident_id}/flags/{flag_id}/dismiss")
@locked
def dismiss_flag(incident_id: str, flag_id: str, body: DismissIn, request: Request):
    return service.dismiss_flag(incident_id, flag_id, body.reason, request.headers.get("x-reviewer") or body.reviewer)


# ---------- dashboard / audit / advisories ----------
@app.get("/api/v1/stats")
@locked
def get_stats():
    return service.stats()


@app.get("/api/v1/hotspots")
@locked
def get_hotspots():
    return {"items": service.hotspots()}


@app.get("/api/v1/audit")
def get_audit(incident_id: Optional[str] = None, limit: int = 200):
    return {"items": service.audit_log(incident_id, limit)}


@app.get("/api/v1/advisories")
def get_advisories():
    return {"items": service.advisories()}


class AdvisoryIn(BaseModel):
    id: str
    issuer: str
    hazard_type: str
    center_lat: float
    center_lon: float
    radius_km: float
    issued_at: str
    valid_until: str
    title: str = ""
    text: str
    assertions: list[dict] = Field(default_factory=list)


@app.post("/api/v1/advisories")
@locked
def add_advisory(a: AdvisoryIn):
    db.insert("advisories", a.model_dump())
    service.refresh_all(force=True)  # re-evaluate flags against the new advisory
    return {"ok": True}


# ---------- admin ----------
@app.post("/api/v1/admin/seed")
@locked
def admin_seed():
    """Reset DB and load ~200 synthetic reports + advisories (use before a demo)."""
    return seeder.seed()


@app.post("/api/v1/admin/reset")
@locked
def admin_reset():
    db.wipe()
    return {"ok": True}


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
