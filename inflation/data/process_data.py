#!/usr/bin/env python3
"""
Extract HLPI annual-change data and expenditure weights from Stats NZ xlsx files.
Run this script whenever source files are updated — output is hlpi.json.
"""

import json
import re
from pathlib import Path
import openpyxl

DATA_DIR = Path(__file__).parent

GROUPS = [
    {"id": "all_households",  "label": "All Households",        "category": "demographic",  "color": "#374151", "sheet": "2.03", "hlc_table": "Table 1"},
    {"id": "beneficiaries",   "label": "Beneficiaries",         "category": "demographic",  "color": "#dc2626", "sheet": "3.03", "hlc_table": "Table 2"},
    {"id": "maori",           "label": "Māori",                 "category": "demographic",  "color": "#059669", "sheet": "4.03", "hlc_table": "Table 3"},
    {"id": "superannuitants", "label": "Superannuitants",       "category": "demographic",  "color": "#7c3aed", "sheet": "5.03", "hlc_table": "Table 4"},
    {"id": "income_q1",       "label": "Income – Lowest 20%",  "category": "income",       "color": "#1e3a8a", "sheet": "6.03",  "hlc_table": "Table 5"},
    {"id": "income_q2",       "label": "Income – Q2",          "category": "income",       "color": "#1d4ed8", "sheet": "7.03",  "hlc_table": "Table 6"},
    {"id": "income_q3",       "label": "Income – Q3",          "category": "income",       "color": "#3b82f6", "sheet": "8.03",  "hlc_table": "Table 7"},
    {"id": "income_q4",       "label": "Income – Q4",          "category": "income",       "color": "#60a5fa", "sheet": "9.03",  "hlc_table": "Table 8"},
    {"id": "income_q5",       "label": "Income – Highest 20%", "category": "income",       "color": "#93c5fd", "sheet": "10.03", "hlc_table": "Table 9"},
    {"id": "expenditure_q1",  "label": "Spending – Lowest 20%","category": "expenditure",  "color": "#78350f", "sheet": "11.03", "hlc_table": "Table 10"},
    {"id": "expenditure_q2",  "label": "Spending – Q2",        "category": "expenditure",  "color": "#b45309", "sheet": "12.03", "hlc_table": "Table 11"},
    {"id": "expenditure_q3",  "label": "Spending – Q3",        "category": "expenditure",  "color": "#d97706", "sheet": "13.03", "hlc_table": "Table 12"},
    {"id": "expenditure_q4",  "label": "Spending – Q4",        "category": "expenditure",  "color": "#f59e0b", "sheet": "14.03", "hlc_table": "Table 13"},
    {"id": "expenditure_q5",  "label": "Spending – Highest 20%","category": "expenditure", "color": "#fbbf24", "sheet": "15.03", "hlc_table": "Table 14"},
]

SKIP_TERMS = {"source"}


def slugify(s):
    s = s.strip().lower()
    s = re.sub(r"[āáà]", "a", s)
    s = re.sub(r"[ēéè]", "e", s)
    s = re.sub(r"[īíì]", "i", s)
    s = re.sub(r"[ōóò]", "o", s)
    s = re.sub(r"[ūúù]", "u", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def indent_level(s):
    return (len(s) - len(s.lstrip())) // 4


def parse_annual_sheet(ws):
    """Parse a x.03 annual-change sheet. Returns (quarters, rows).
    rows = list of {id, label, level, values}
    """
    rows_raw = list(ws.iter_rows(values_only=True))

    # Find the date-header row: first row where col[2] looks like "Dec-22" etc.
    date_row_idx = None
    for i, row in enumerate(rows_raw):
        if row[2] and re.match(r"[A-Z][a-z]{2}-\d{2}", str(row[2])):
            date_row_idx = i
            break
    if date_row_idx is None:
        raise ValueError("Could not find date header row")

    date_row = rows_raw[date_row_idx]
    # Dates are at even indices starting from 2
    col_indices = [i for i in range(2, len(date_row), 2) if date_row[i] is not None]
    quarters = [str(date_row[i]) for i in col_indices]

    rows = []
    current_group_id = None
    for row in rows_raw[date_row_idx + 1:]:
        name = row[0]
        if not name:
            continue
        name_str = str(name)
        if any(t in name_str.lower() for t in SKIP_TERMS):
            continue

        level = indent_level(name_str)
        if level >= 2:  # skip sub-subgroups (8-space indent)
            continue

        clean = name_str.strip()

        # "All groups" row → stored in annual as "all", not as a subgroup
        is_all_groups = clean.lower() == "all groups"
        row_id = "all" if is_all_groups else slugify(clean)

        if not is_all_groups:
            if level == 0:
                current_group_id = row_id
            elif level == 1:
                row_id = current_group_id + "__" + row_id

        values = []
        for ci in col_indices:
            v = row[ci]
            values.append(round(float(v), 2) if v is not None else None)

        rows.append({"id": row_id, "label": clean, "level": level, "values": values,
                     "is_summary": is_all_groups})

    return quarters, rows


def parse_hlc_weights(ws):
    """Parse an HLC24 table sheet. Returns {row_id: weight} using Dec 2024 column."""
    rows_raw = list(ws.iter_rows(values_only=True))

    # Find the row containing "December 2024"
    dec2024_col = None
    for row in rows_raw:
        for ci, cell in enumerate(row):
            if cell and "December 2024" in str(cell):
                dec2024_col = ci
                break
        if dec2024_col is not None:
            break

    if dec2024_col is None:
        return {}

    weights = {}
    current_group_id = None
    parsing = False
    for row in rows_raw:
        name = row[0]
        if not name:
            continue
        name_str = str(name)

        # Start parsing after we've passed the header area
        if "Group or subgroup" in name_str:
            parsing = True
            continue
        if not parsing:
            continue
        if any(t in name_str.lower() for t in {"source", "all groups", "figures may"}):
            continue

        level = indent_level(name_str)
        if level >= 2:
            continue

        clean = name_str.strip()
        row_id = slugify(clean)

        if level == 0:
            current_group_id = row_id
        elif level == 1:
            row_id = current_group_id + "__" + row_id

        val = row[dec2024_col]
        if val is not None:
            try:
                weights[row_id] = round(float(val), 4)
            except (TypeError, ValueError):
                pass

    return weights


def build_subgroup_list(all_rows):
    """Build a deduplicated ordered list of subgroup metadata, excluding the summary row."""
    seen = {}
    order = []
    for rows in all_rows:
        for r in rows:
            if r.get("is_summary"):
                continue
            if r["id"] not in seen:
                seen[r["id"]] = r
                order.append(r["id"])
    result = []
    for rid in order:
        r = seen[rid]
        parent = rid.split("__")[0] if "__" in rid else None
        result.append({"id": rid, "label": r["label"], "level": r["level"], "parent": parent})
    return result


def main():
    hlc_wb = openpyxl.load_workbook(DATA_DIR / "HLC24.xlsx")
    hlpi_wb = openpyxl.load_workbook(DATA_DIR / "hlcdatadec25.xlsx")

    # Parse each group's annual change sheet
    all_parsed_rows = []
    quarters = None
    groups_out = []

    for g in GROUPS:
        ws = hlpi_wb[g["sheet"]]
        q, rows = parse_annual_sheet(ws)
        if quarters is None:
            quarters = q
        all_parsed_rows.append(rows)

        # Build annual dict: row_id -> [values]
        annual = {}
        for r in rows:
            key = "all" if r["label"].lower() == "all groups" else r["id"]
            annual[key] = r["values"]

        # Parse HLC24 weights for this group
        hlc_ws = hlc_wb[g["hlc_table"]]
        weights = parse_hlc_weights(hlc_ws)

        groups_out.append({
            "id": g["id"],
            "label": g["label"],
            "category": g["category"],
            "color": g["color"],
            "annual": annual,
            "weights": weights,
        })

    subgroups = build_subgroup_list(all_parsed_rows)

    output = {
        "generated": "2026-04-29",
        "note": "Headline uses All Households HLPI. Official CPI series to be added.",
        "quarters": quarters,
        "subgroups": subgroups,
        "groups": groups_out,
    }

    out_path = DATA_DIR / "hlpi.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Written {out_path} — {len(quarters)} quarters, {len(groups_out)} groups, {len(subgroups)} subgroup rows")


if __name__ == "__main__":
    main()
