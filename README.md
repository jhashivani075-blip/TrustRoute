# TrustRoute Backend (FastAPI + SQLite)

Small, dependency-light backend covering every feature in the blueprint. No Postgres, no ML model downloads,
no API keys: it runs offline, which is what the blueprint asks for on demo day.

## Run (2 minutes)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- On first start the DB is auto-seeded with ~200 synthetic reports + 7 advisories (19 incidents).
- Swagger UI: http://localhost:8000/docs
- Re-seed before a demo (resets the clock so freshness badges look right): `POST /api/v1/admin/seed`
- Tests: `python tests/test_core.py`

## Connect the frontend
Copy the files from `frontend-patch/` over `frontend/` and create `frontend/.env.local`:
`NEXT_PUBLIC_API_URL=http://localhost:8000`. Without that variable the UI keeps its old local simulation.

## Endpoints (`/api/v1`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/reports` | Ingest one report -> cluster, freshness, flags, priority (400 gibberish/future time, 409 exact duplicate) |
| POST | `/reports/bulk` | CSV upload (multipart `file`, JSON `{csv_text}` / `{reports:[]}`, or raw CSV) |
| GET | `/incidents` | Queue. Filters: `level` (or `priority`), `status`, `hazard`, `flag`, `freshness`, `q`, `unlocated`, `limit`, `offset`, `include_reports` |
| GET | `/incidents/{id}` | Detail: reports, flags + evidence, advisories, advisory matches, score breakdown |
| POST | `/incidents/{id}/review` | `CONFIRM, NEEDS_VERIFICATION, RESOLVE, SPLIT, DISMISS_DUPLICATE/MERGE, EDIT` (+ `dismissed_flags`) |
| POST | `/incidents/{id}/flags/{flag_id}/dismiss` | Dismiss one flag with a mandatory reason |
| GET | `/stats` | Dashboard KPIs, reports over time, flags by type |
| GET | `/hotspots` | Emerging hotspot detection (stretch goal) |
| GET | `/audit` | Append-only audit log (before/after JSON) |
| GET/POST | `/advisories` | List / add advisories (adding re-evaluates all flags) |
| POST | `/admin/seed`, `/admin/reset` | Demo data helpers |

CSV columns: `location_text,lat,lon,description,reported_severity,source_type,source_detail,reported_at`
(header row optional; header-less rows use the order `location,lat,lon,description,severity` like the UI modal).
Send `X-Reviewer: <name>` on review calls to record who acted.

## How the blueprint maps to code
| Blueprint | File |
|---|---|
| Duplicate clustering (hazard + similarity + 2 km + 6 h), "possible duplicate" tier | `service.find_cluster` |
| Freshness windows | `config.FRESHNESS_WINDOWS`, `rules.freshness` |
| Flags: MISSING_SOURCE, LOW_ATTRIBUTION, LOCATION_CONFLICT, ADVISORY_CONFLICT, OUTDATED, INCOMPLETE, SEVERITY_MISMATCH | `rules.compute_flags` |
| Advisory matcher with structured assertions + "aligned" evidence | `rules.match_advisories` |
| Deterministic score (urgency x freshness + corroboration + conflict attention) | `rules.priority` |
| HITL actions, rescoring, audit log | `service.review` |
| Phone masking, edge cases (empty, future time, exact duplicate, missing location/time) | `service.ingest` |
| All weights/thresholds in one place | `config.py` |

## Deliberate simplifications (so it finishes fast)
- **SQLite instead of Postgres + pgvector.** JSON stored as text. Nothing to install.
- **Rule-based extraction instead of an LLM** (`extraction_source: "RULES"`, the blueprint's fallback path). Handles English + Hinglish keywords.
- **Lexical similarity instead of sentence embeddings** (cosine over normalised word counts, Hindi/Hinglish synonyms mapped). Because it is not an embedding, thresholds in `config.py` are lower than the blueprint's 0.80. To upgrade, change only `nlp.similarity()`.
- **Offline gazetteer** (`data/gazetteer.csv`) for place names and coordinate lookup; no Nominatim.
- Runs synchronously (200 CSV rows take well under a second), so no background-task machinery.
- `OUTDATED` is raised once per incident when *all* its reports are outdated (individual reports still carry their freshness badge). `NO_ADVISORY_COVER` is returned as an informational `notes` entry, not a flag, so it doesn't inflate flag counts.
- `SPLIT` without `report_ids` splits off the single report least similar to the rest (the most likely wrong merge).
- A new report joining a `REVIEWED`/`NEEDS_VERIFICATION` incident moves it back to `PENDING` and is logged.
