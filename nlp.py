"""Rule-based extraction + lexical similarity. No model downloads, works offline.

Swap-in point: if you later want sentence-transformers, replace `similarity()` only.
"""
import math
import re
from collections import Counter

from .geo import find_places

HAZARD_WORDS = {
    "FLOOD": ["flood", "water", "waterlog", "inundat", "submerg", "pani", "baadh", "badh", "overflow", "drain", "boat", "sluice", "tide"],
    "FIRE": ["fire", "smoke", "blaze", "flame", "aag", "dhuan", "burning", "transformer", "brigade"],
    "LANDSLIDE": ["landslide", "rockfall", "boulder", "mudslide", "debris", "bhuskhalan", "malba", "mudflow"],
    "CYCLONE": ["cyclone", "storm", "wind", "gale", "uproot", "toofan", "tufan", "tree fell", "trees fallen", "ped gir"],
    "EARTHQUAKE": ["earthquake", "tremor", "quake", "collapse", "bhookamp", "bhukamp", "rubble", "imarat gir"],
}
HAZARD_ORDER = ["FLOOD", "FIRE", "LANDSLIDE", "CYCLONE", "EARTHQUAKE"]

CUE_PATTERNS = {
    "trapped": r"\b(trap\w*|stuck|stranded|marooned|fas(?:a|e|s)\w*|surrounded|under rubble)\b",
    "injured": r"\b(injur\w*|bleed\w*|hurt|casualt\w*|wounded|ghayal|burn(?:s|ed|t)?)\b",
    "children/elderly": r"\b(child\w*|kids?|babies|baby|infant\w*|elderly|senior\w*|old (?:man|woman|people|couple)|bachch\w*|bujurg|pregnant|bedridden|disabled)\b",
    "medical need": r"\b(medical|oxygen|ambulance|doctor|hospital|dialysis|insulin|patients?)\b",
}

OPEN_WORDS = {"open", "clear", "cleared", "passable", "safe", "moving", "running", "normal", "khula", "chalu"}
CLOSED_WORDS = {"closed", "blocked", "shut", "impassable", "band", "washed", "jammed"}
NEGATIONS = {"not", "no", "nahi", "nahin", "never", "isnt", "isn't"}

STOP = set("""a an the is are was were be been in on at of to for and or but with by from near it its this that these those as
there here has have had will would can could should please pls urgent now very so than then into onto over under up down out
mein me ka ki ke ko se par pe hai hain tha thi hua hui gaya gayi gaye raha rahi rahe aur bhi ya
""".split())

SYN = {
    "stuck": "trapped", "stranded": "trapped", "trapped": "trapped", "fase": "trapped", "fasa": "trapped",
    "fasi": "trapped", "marooned": "trapped", "pani": "water", "ghar": "home", "homes": "home", "houses": "home",
    "house": "home", "flooded": "flood", "flooding": "flood", "inundated": "flood", "baadh": "flood", "badh": "rising",
    "bujurg": "elderly", "bachcha": "child", "bachche": "child", "children": "child", "kids": "child", "kid": "child",
    "aag": "fire", "dhuan": "smoke", "ghayal": "injured", "hurt": "injured", "bhuskhalan": "landslide",
    "malba": "debris", "rubble": "debris", "sadak": "road", "rasta": "road", "bhookamp": "earthquake",
    "bhukamp": "earthquake", "quake": "earthquake", "toofan": "storm", "tufan": "storm", "ped": "tree", "trees": "tree",
    "gir": "fall", "fallen": "fall", "fell": "fall", "collapsed": "collapse", "imarat": "building", "bijli": "power",
    "gaadi": "vehicle", "vehicles": "vehicle", "cars": "vehicle", "waterlogging": "flood", "waterlogged": "flood",
    "submerged": "flood", "bachao": "rescue", "boulders": "boulder", "poles": "pole", "khambe": "pole",
}


def _stem(w):
    for suf in ("ing", "ed", "es", "s"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def tokens(text):
    out = []
    for w in re.findall(r"[a-z0-9\-]+", (text or "").lower()):
        if w in STOP or len(w) < 2:
            continue
        w = SYN.get(w, w)
        w = SYN.get(_stem(w), _stem(w))
        out.append(w)
    return out


def similarity(a, b):
    """Cosine similarity of term-frequency vectors (0..1)."""
    ca, cb = Counter(tokens(a)), Counter(tokens(b))
    if not ca or not cb:
        return 0.0
    dot = sum(ca[t] * cb.get(t, 0) for t in ca)
    na = math.sqrt(sum(v * v for v in ca.values()))
    nb = math.sqrt(sum(v * v for v in cb.values()))
    return dot / (na * nb) if na and nb else 0.0


def detect_hazard(text):
    t = (text or "").lower()
    scores = {h: sum(t.count(w) for w in ws) for h, ws in HAZARD_WORDS.items()}
    best = max(HAZARD_ORDER, key=lambda h: (scores[h], -HAZARD_ORDER.index(h)))
    return best if scores[best] > 0 else "UNKNOWN"


def detect_language(text):
    t = (text or "")
    if re.search(r"[\u0900-\u097F]", t):
        return "Hindi"
    hi = {"mein", "hai", "hain", "pani", "bohot", "nahi", "ghar", "par", "gaya", "log", "aur", "ke", "ki", "baadh", "aag", "mat", "raha", "rahe", "tha"}
    words = set(re.findall(r"[a-z]+", t.lower()))
    return "Hinglish" if len(words & hi) >= 2 else "English"


def _state_near(sentence, start, end):
    """OPEN / CLOSED claim made near an entity mention inside one sentence, else None."""
    words = re.findall(r"[a-z']+", sentence[end:].lower())[:8] or []
    prev = re.findall(r"[a-z']+", sentence[:start].lower())[-3:]
    for i, w in enumerate(words):
        state = "OPEN" if w in OPEN_WORDS else "CLOSED" if w in CLOSED_WORDS else None
        if state:
            neg = (i > 0 and words[i - 1] in NEGATIONS) or (i > 1 and words[i - 2] in NEGATIONS)
            if neg:
                state = "CLOSED" if state == "OPEN" else "OPEN"
            return state
    for w in prev:  # "open bridge" style
        if w in OPEN_WORDS:
            return "OPEN"
        if w in CLOSED_WORDS:
            return "CLOSED"
    return None


def extract(description, location_text="", known_entities=None):
    """Return the `extracted` JSON for a report.

    known_entities: {entity_lowercase_name_or_alias: canonical_entity} taken from advisories,
    so claims line up with advisory assertions. Anything unparseable yields no claim.
    """
    text = description or ""
    low = text.lower()
    cues, evidence = [], []
    for label, pat in CUE_PATTERNS.items():
        for m in re.finditer(pat, low):
            if label not in cues:
                cues.append(label)
            evidence.append(m.group(0))
    claims = []
    for sent_m in re.finditer(r"[^.!?;\n]+", text):
        sent = sent_m.group(0)
        sl = sent.lower()
        for name, canon in (known_entities or {}).items():
            m = re.search(r"(?<![a-z0-9])" + re.escape(name) + r"(?![a-z0-9])", sl)
            if m:
                st = _state_near(sent, m.start(), m.end())
                if st and not any(c["entity"] == canon for c in claims):
                    claims.append({"entity": canon, "state": st, "snippet": sent.strip()[:160]})
    places = [p["name"] for p in find_places(text + " " + (location_text or ""))]
    for m in re.finditer(r"\bward\s*\d+\b", low):
        if m.group(0).title() not in places:
            places.append(m.group(0).title())
    return {
        "hazard_type": detect_hazard(text),
        "place_mentions": places,
        "claims": claims,
        "life_safety_cues": cues,
        "evidence_terms": sorted(set(evidence)),
        "language": detect_language(text),
        "extraction_source": "RULES",
    }
