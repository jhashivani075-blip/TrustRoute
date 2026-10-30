import csv
import math
import os
import re

_GAZ = None


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def gazetteer():
    global _GAZ
    if _GAZ is None:
        path = os.path.join(os.path.dirname(__file__), "..", "data", "gazetteer.csv")
        _GAZ = []
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                names = [row["name"]] + [a for a in (row.get("aliases") or "").split(";") if a.strip()]
                _GAZ.append({"name": row["name"], "lat": float(row["lat"]), "lon": float(row["lon"]),
                             "names": [n.strip().lower() for n in names]})
    return _GAZ


def find_places(text):
    """Gazetteer places mentioned in text (word-boundary, case-insensitive)."""
    t = (text or "").lower()
    found = []
    for p in gazetteer():
        for n in p["names"]:
            if re.search(r"(?<![a-z0-9])" + re.escape(n) + r"(?![a-z0-9])", t):
                found.append(p)
                break
    return found


def geocode(location_text):
    """Offline geocoder: best gazetteer match for a location string, or None."""
    places = find_places(location_text)
    if not places:
        return None
    return max(places, key=lambda p: max(len(n) for n in p["names"] if n in location_text.lower()))
