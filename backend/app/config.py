"""All tunable numbers live here (blueprint: 'one config file, tune in minutes')."""
import os

DB_PATH = os.getenv("TRUSTROUTE_DB", "trustroute.db")
AUTO_SEED = os.getenv("AUTO_SEED", "true").lower() == "true"

# Freshness windows in hours: (FRESH up to, AGING up to) else OUTDATED  (blueprint 11.2)
FRESHNESS_WINDOWS = {
    "FLOOD": (3, 6),
    "FIRE": (1, 2),
    "EARTHQUAKE": (2, 4),
    "LANDSLIDE": (4, 8),
    "CYCLONE": (6, 12),
    "UNKNOWN": (3, 6),
}

# Duplicate clustering (blueprint 11.1). Similarity here is lexical (no ML model),
# so the numbers are lower than the 0.80 suggested for sentence embeddings.
SIM_MERGE = 0.25            # merge when same hazard + close + recent + sim >= this
SIM_MERGE_NO_COORDS = 0.50  # stricter if either side has no coordinates
SIM_POSSIBLE = 0.12         # below SIM_MERGE but above this -> "possible duplicate" link only
MERGE_RADIUS_KM = 2.0
MERGE_WINDOW_HOURS = 6.0

# Flags
LOCATION_CONFLICT_KM = 5.0
CLUSTER_SPREAD_KM = 3.0
SEVERITY_MISMATCH_LEVELS = 2
FUTURE_TOLERANCE_MIN = 5

# Priority score (blueprint 13)
SEVERITY_POINTS = {"CRITICAL": 70, "HIGH": 50, "MEDIUM": 30, "LOW": 10}
SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
CUE_POINTS = {"trapped": 15, "injured": 10, "children/elderly": 5, "medical need": 5}
CUE_CAP = 30
FRESHNESS_FACTOR = {"FRESH": 1.0, "AGING": 0.7, "OUTDATED": 0.4}
CORROBORATION_PER_SOURCE = 5
CORROBORATION_CAP = 15
CONFLICT_ATTENTION_POINTS = 10
CONFLICT_ATTENTION_MIN_URGENCY = 50
LEVEL_HIGH = 70
LEVEL_MEDIUM = 40

# Hotspots (stretch)
HOTSPOT_CELL_DEG = 0.045  # ~5 km
HOTSPOT_WINDOW_HOURS = 2
HOTSPOT_MIN_COUNT = 3

REFRESH_TTL_SECONDS = 30  # how often GET endpoints re-evaluate freshness/scores
DEFAULT_REVIEWER = "Duty Coordinator"
