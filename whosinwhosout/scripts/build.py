#!/usr/bin/env python3
"""Turn cached raw wikitext into data/derived/data.json for the site.

Reads data/raw/ and data/manual/ only. Writes data/derived/ and data.json.
"""
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wiki  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MANUAL = ROOT / "data" / "manual"
DERIVED = ROOT / "data" / "derived"

POLL_PARTIES = ["NAT", "LAB", "GRN", "ACT", "NZF", "TPM", "OPP"]

PARTIES = {
    "NAT": {"name": "National", "colour": "#00529F"},
    "LAB": {"name": "Labour", "colour": "#D82A20"},
    "GRN": {"name": "Green", "colour": "#098137"},
    "ACT": {"name": "ACT", "colour": "#FDE401"},
    "NZF": {"name": "NZ First", "colour": "#2b2b2b"},
    "TPM": {"name": "Te Pāti Māori", "colour": "#B2001A"},
    "OPP": {"name": "Opportunity", "colour": "#32DAC3"},
    "OTH": {"name": "Other", "colour": "#999999"},
}

# Wikipedia party article names (and variants) -> our codes.
PARTY_ALIASES = {
    "new zealand national party": "NAT",
    "new zealand labour party": "LAB",
    "green party of aotearoa new zealand": "GRN",
    "act new zealand": "ACT",
    "new zealand first": "NZF",
    "te pati maori": "TPM",
    "maori party": "TPM",
    "the opportunities party": "OPP",
    "the opportunity party": "OPP",
    "opportunity party new zealand": "OPP",
    "opportunity party": "OPP",
}

# Party list sections on the lists page -> codes (only parties we model by name).
LIST_SECTIONS = {
    "ACT Party": "ACT", "Green Party": "GRN", "Labour Party": "LAB",
    "National Party": "NAT", "New Zealand First": "NZF", "Te Pāti Māori": "TPM",
    "Opportunity Party": "OPP",
}


def party_code(name):
    n = wiki.norm(wiki.delink(name))
    return PARTY_ALIASES.get(n)


def num(s):
    s = wiki.delink(s).replace(",", "").strip()
    m = re.search(r"-?\d+(\.\d+)?", s)
    return float(m.group()) if m else None


# ---------- Polls ----------

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def parse_date_range(text, end_iso):
    """'20–26 Oct 2026' or '30 Oct – 26 Nov 2023' or '26 Oct 2026' -> (start, end) ISO."""
    end = dt.date.fromisoformat(end_iso)
    t = wiki.delink(text).replace("&nbsp;", " ")
    m = re.match(r"\s*(\d{1,2})\s*(?:([A-Za-z]{3})[a-z]*\s*(\d{4})?)?\s*[–-]", t)
    if not m:
        return end_iso, end_iso
    day = int(m.group(1))
    mon = MONTHS.get((m.group(2) or "").lower()[:3], end.month)
    year = int(m.group(3)) if m.group(3) else (end.year if mon <= end.month else end.year - 1)
    try:
        return dt.date(year, mon, day).isoformat(), end_iso
    except ValueError:
        return end_iso, end_iso


def pollster_name(raw):
    s = wiki.delink(re.sub(r"\[https?://\S+\s+([^\]]+)\]", r"\1", raw)).strip()
    k = s.lower()
    if "curia" in k:
        return "Curia"
    if "verian" in k or "1 news" in k:
        return "1News Verian"
    if "reid" in k:
        return "RNZ Reid Research"
    if "freshwater" in k:
        return "Freshwater Strategy"
    if "talbot" in k:
        return "Talbot Mills"
    return s


def cell_value(c):
    """A wikitable cell may be 'attrs | value'; return the value part."""
    depth, last = 0, -1
    for i in range(len(c)):
        two = c[i:i + 2]
        if two in ("[[", "{{"):
            depth += 1
        elif two in ("]]", "}}"):
            depth -= 1
        elif c[i] == "|" and depth == 0 and c[i - 1:i + 1] != "||":
            last = i
    return c[last + 1:].strip() if last >= 0 else c.strip()


def parse_polls():
    text = (RAW / "polls.wikitext").read_text()
    start = text.index("=== Table of polls ===")
    end = text.index("== Electorate polling")
    table = wiki.strip_templates(wiki.strip_refs(text[start:end]), {"efn", "efn-ua", "efn-lr"})
    polls, result2023 = [], None
    for row in table.split("\n|-"):
        lines = [ln for ln in row.split("\n") if ln.startswith("|") and not ln.startswith(("|-", "|}", "|+"))]
        if not lines or "colspan" in row:
            continue
        cells = []
        for ln in lines:
            cells += ln[1:].split("||")
        if len(cells) < 11:
            continue
        sort = re.search(r'data-sort-value="(\d{4}-\d{2}-\d{2})"', cells[0])
        if not sort:
            continue
        vals = [cell_value(c) for c in cells]
        nums = [num(v) if wiki.delink(v) not in ("", "–", "-") else None for v in vals[3:11]]
        if "2023 election result" in row:
            result2023 = dict(zip(POLL_PARTIES, nums[:7]))
            continue
        s, e = parse_date_range(vals[0], sort.group(1))
        sample = num(vals[2]) if wiki.delink(vals[2]) else None
        polls.append({
            "pollster": pollster_name(vals[1]),
            "start": s, "end": e,
            "sample": int(sample) if sample else None,
            "pct": {p: v for p, v in zip(POLL_PARTIES, nums[:7])},
            "other": nums[7],
        })
    return polls, result2023


# ---------- 2023 electorate results ----------

def winners_2023():
    text = (RAW / "results2023.wikitext").read_text()
    out = {}
    for kind in ("hold", "change"):
        for b in wiki.templates(text, f"NZ electorate result {kind}"):
            p = wiki.params(b)
            name = wiki.delink(p.get("winner") or "") or wiki.delink(p["incumbent"])
            # A "hold" means the incumbent's party kept the seat. Trust that over
            # winner-party, which is sometimes filled in wrongly (Te Atatū, 2023).
            party = p["incumbent-party"] if kind == "hold" else (p.get("winner-party") or p["incumbent-party"])
            out[p["electorate"]] = {
                "winner": name, "party": party_code(party) or "OTH",
                "majority": int(num(p.get("majority", "")) or 0) or None,
            }
    return out


def box_regions(text):
    """Yield (title, body) for each election box in an article."""
    begins = [m for m in re.finditer(r"\{\{\s*(?:MMP )?(?:by-)?election box begin", text, re.I)]
    for i, m in enumerate(begins):
        stop = begins[i + 1].start() if i + 1 < len(begins) else len(text)
        endm = re.search(r"\{\{\s*election box end", text[m.start():stop], re.I)
        body = text[m.start(): m.start() + endm.start()] if endm else text[m.start():stop]
        bp = wiki.params(next(wiki.templates(body, body[2:].split("|")[0].strip())) or "")
        title = bp.get("title", "")
        if "by-election" in m.group(0).lower():
            title = f"{bp.get('year', '')} {bp.get('electorate', '')} by-election"
        yield title, body


def vote_shares_2023(article, by_election=False):
    """Electorate (candidate) vote shares from the 2023 box in an electorate article."""
    want = "2023 Port Waikato by-election" if by_election else "2023 New Zealand general election"
    for title, body in box_regions(article):
        if want not in title:
            continue
        cands = []
        for m in re.finditer(r"\{\{\s*((?:MMP )?(?:by-)?election box [^|}\n]*)", body, re.I):
            tname = m.group(1).strip()
            if re.search(r"begin|total|informal|majority|turnout|registered|party only|end", tname, re.I):
                continue
            p = wiki.params(next(wiki.templates(body[m.start():], tname)))
            votes = num(p.get("votes", ""))
            cand = wiki.delink(p.get("candidate", ""))
            if not cand or votes is None:
                continue
            party = "Independent" if "independent" in tname.lower() else wiki.delink(p.get("party", ""))
            cands.append({"cand": cand, "party": party_code(party) or "OTH",
                          "partyName": party, "votes": int(votes)})
        if not cands:
            continue
        total = sum(c["votes"] for c in cands)
        for c in cands:
            c["pct"] = round(100 * c["votes"] / total, 2)
        return sorted(cands, key=lambda c: -c["votes"])
    return None


# ---------- 2026 candidates and lists ----------

def candidates_2026():
    text = (RAW / "candidates2026.wikitext").read_text()
    parts = re.split(r"^===\s*([^=]+?)\s*===\s*$", text, flags=re.M)
    out = {}
    for name, body in zip(parts[1::2], parts[2::2]):
        body = body.split("Retiring incumbents and withdrawn")[0]
        cands = []
        for m in re.finditer(r"\{\{\s*(NZ election box (?:candidate|incumbent|independent)[^|}\n]*)", body):
            p = wiki.params(next(wiki.templates(body[m.start():], m.group(1).strip())))
            party = "Independent" if "independent" in m.group(1) else wiki.delink(p.get("party", ""))
            lst = num(p.get("list", ""))
            cands.append({
                "name": wiki.delink(p.get("candidate", "")),
                "party": party_code(party) or "OTH", "partyName": party,
                "list": int(lst) if lst else None,
                "incumbent": "incumbent" in m.group(1),
            })
        out[name.strip()] = cands
    return out


def party_lists():
    text = (RAW / "lists2026.wikitext").read_text()
    parts = re.split(r"^===\s*([^=]+?)\s*===\s*$", text, flags=re.M)
    out = {}
    for name, body in zip(parts[1::2], parts[2::2]):
        code = LIST_SECTIONS.get(name.strip())
        if not code:
            continue
        # Some parties (Greens) show an initial list then the final one: use the last.
        body = body[body.rfind("{{NZ party list begin"):]
        rows = []
        for b in wiki.templates(body, "NZ party list candidate"):
            p = wiki.params(b)
            rank = num(p.get("rank", ""))
            if rank is None:
                continue
            rows.append({"rank": int(rank), "name": wiki.delink(p.get("fullname", "")),
                         "contesting": wiki.delink(p.get("contesting", "")) or None})
        out[code] = sorted(rows, key=lambda r: r["rank"])
    return out


def port_waikato_winner():
    text = (RAW / "electorates" / "port_waikato.wikitext").read_text()
    shares = vote_shares_2023(text, by_election=True)
    return shares


def main():
    DERIVED.mkdir(exist_ok=True)
    polls, national2023 = parse_polls()
    wins = winners_2023()
    cands = candidates_2026()
    lists = party_lists()
    index = json.loads((RAW / "electorates" / "_index.json").read_text())

    # Election-night 2023 electorate wins by party (Port Waikato not yet decided),
    # used by the test that reproduces the 2023 Parliament.
    wins2023 = {}
    for w in wins.values():
        wins2023[w["party"]] = wins2023.get(w["party"], 0) + 1

    # Port Waikato: electorate vote cancelled in 2023; use the by-election.
    pw = port_waikato_winner()
    wins["Port Waikato"] = {"winner": pw[0]["cand"], "party": pw[0]["party"],
                            "majority": pw[0]["votes"] - pw[1]["votes"], "byElection": True}

    with open(MANUAL / "electorate_mapping.csv", newline="") as f:
        mapping = list(csv.DictReader(f))

    # Seats called by hand for the swing model (electorate polls, retirements).
    with open(MANUAL / "swing_calls.csv", newline="") as f:
        swing_calls = {r["electorate"]: {"party": r["party"], "reason": r["reason"]} for r in csv.DictReader(f)}
    for name in swing_calls:
        if name not in {r["new_electorate"] for r in mapping}:
            print("PROBLEM swing call for unknown electorate", name)

    maori = {"Hauraki-Waikato", "Ikaroa-Rāwhiti", "Tāmaki Makaurau", "Te Tai Hauāuru",
             "Te Tai Tokerau", "Te Tai Tonga", "Waiariki"}
    electorates, problems = [], []
    for row in mapping:
        new, pred = row["new_electorate"], row["predecessor_2023"]
        art = index.get(pred)
        shares = None
        if art:
            atext = (RAW / "electorates" / art["file"]).read_text()
            shares = vote_shares_2023(atext)
        if pred == "Port Waikato":
            shares = pw
        if not shares:
            problems.append(f"No 2023 vote shares for {pred}")
        if new not in cands:
            problems.append(f"No 2026 candidate section for {new}")
        if pred not in wins:
            problems.append(f"No 2023 winner for {pred}")
        electorates.append({
            "name": new, "maori": new in maori, "pred": pred,
            "change": row["change_type"], "confidence": row["confidence"], "notes": row["notes"],
            "win2023": wins.get(pred),
            "shares2023": [{k: c[k] for k in ("cand", "party", "pct")} for c in (shares or [])],
            "candidates": cands.get(new, []),
            "swingCall": swing_calls.get(new),
        })

    built = dt.date.today().isoformat()
    data = {
        "version": 1, "built": built,
        "fetched": dt.date.fromtimestamp((RAW / "polls.wikitext").stat().st_mtime).isoformat(),
        "parties": PARTIES, "pollParties": POLL_PARTIES,
        "national2023": national2023, "electorateWins2023": wins2023, "polls": polls,
        "electorates": electorates, "lists": lists,
    }
    (DERIVED / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    # The site loads data.js (a plain script) so it also works from file://.
    (ROOT / "data.js").write_text("window.WIWO_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    print(f"polls {len(polls)}, electorates {len(electorates)}, lists {', '.join(f'{k}:{len(v)}' for k, v in lists.items())}")
    print("national2023", national2023)
    for p in problems:
        print("PROBLEM", p)


if __name__ == "__main__":
    main()
