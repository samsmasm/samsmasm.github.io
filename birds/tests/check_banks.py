"""Validate all four category banks. Run: python3 tests/check_banks.py"""
import json, re, sys
from collections import Counter
from pathlib import Path

data = Path(__file__).resolve().parent.parent / "data"
problems = 0
KIDS_BANKS = ["kids_categories.json", "sound_categories.json"]

# Sound it out: words over 4 letters must be on this list, and each one must be easy to sound out.
SOUND_LONG = {"chick", "squid", "dress", "truck", "drill", "brush", "swing", "frost",
              "stick", "plant", "stand", "thick", "black"}
# Patterns a new reader cannot sound out letter by letter: vowel teams, r and w changing a vowel, silent letters.
SOUND_HARD = re.compile(r"[aeiou]{2}|[aeiou]r|[aeiou]w|[aeiou]y|wa|igh|kn|wr|mb|[aeiou][^aeiou]e$|^[^aeiou]+[aeiouy]$")
def sound_errors(d):
    errs = []
    words = [w for c in d["categories"] for w in c["words"]]
    errs += [f"{w} appears twice" for w, n in Counter(x.lower() for x in words).items() if n > 1]
    for w in words:
        if len(w) > 4 and w.lower() not in SOUND_LONG: errs.append(f"{w} is too long")
        if SOUND_HARD.search(w.lower().replace("qu", "q")): errs.append(f"{w} may not be decodable")
    three = sum(len(w) <= 3 for w in words) / len(words)
    print(f"  {len(words)} words, {three:.0%} with 3 letters or fewer")
    if three < .55: errs.append("most words should have 3 letters")
    return errs

for name in ["bm_categories.json", "econ_categories.json", "kids_categories.json", "sound_categories.json"]:
    d = json.loads((data / name).read_text(encoding="utf-8"))
    cats = d["categories"]
    ids = [c["id"] for c in cats]
    codes = {t["code"] for t in d["meta"]["topics"]}
    errs = []
    errs += ["duplicate id " + i for i, n in Counter(ids).items() if n > 1]
    for c in cats:
        for k in ["id", "name", "tier", "topics", "words", "clashesWith"]:
            if k not in c: errs.append(f"{c.get('id')} missing {k}")
        if len(c["words"]) < 3: errs.append(f"{c['id']} has fewer than 3 words")
        if "emoji" in c and len(c["emoji"]) != len(c["words"]): errs.append(f"{c['id']} emoji length mismatch")
        errs += [f"{c['id']} unknown topic {t}" for t in c["topics"] if t not in codes]
        if "level" in c:
            off = {t["code"] for t in d["meta"]["topics"] if t.get("defaultOn") is False}
            want = "HL" if any(t in off for t in c["topics"]) else "SL"
            if c["level"] != want: errs.append(f"{c['id']} level {c['level']} should be {want}")
            if c["level"] == "HL" and not c["ref"].endswith("HL"): errs.append(f"{c['id']} HL ref should end with HL")
        elif name not in KIDS_BANKS: errs.append(f"{c['id']} missing level")
        errs += [f"{c['id']} unknown clash {x}" for x in c["clashesWith"] if x not in set(ids)]
    # shared words between categories must be declared as clashes
    for i, a in enumerate(cats):
        for b in cats[i + 1:]:
            shared = {w.lower() for w in a["words"]} & {w.lower() for w in b["words"]}
            if shared and b["id"] not in a["clashesWith"] and a["id"] not in b["clashesWith"]:
                errs.append(f"{a['id']} and {b['id']} share {sorted(shared)} but do not list each other")
    if name == "sound_categories.json": errs += sound_errors(d)
    tiers = sorted(Counter(c["tier"] for c in cats).items())
    print(f"{name}: {len(cats)} categories, tiers {tiers}, {len(errs)} problems")
    for e in errs: print("  ", e)
    problems += len(errs)
sys.exit(1 if problems else 0)
