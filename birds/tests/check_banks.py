"""Validate all three category banks. Run: python3 tests/check_banks.py"""
import json, sys
from collections import Counter
from pathlib import Path

data = Path(__file__).resolve().parent.parent / "data"
problems = 0
for name in ["bm_categories.json", "econ_categories.json", "kids_categories.json"]:
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
        errs += [f"{c['id']} unknown clash {x}" for x in c["clashesWith"] if x not in set(ids)]
    # shared words between categories must be declared as clashes
    for i, a in enumerate(cats):
        for b in cats[i + 1:]:
            shared = {w.lower() for w in a["words"]} & {w.lower() for w in b["words"]}
            if shared and b["id"] not in a["clashesWith"] and a["id"] not in b["clashesWith"]:
                errs.append(f"{a['id']} and {b['id']} share {sorted(shared)} but do not list each other")
    tiers = sorted(Counter(c["tier"] for c in cats).items())
    print(f"{name}: {len(cats)} categories, tiers {tiers}, {len(errs)} problems")
    for e in errs: print("  ", e)
    problems += len(errs)
sys.exit(1 if problems else 0)
