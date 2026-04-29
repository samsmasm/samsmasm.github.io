#!/usr/bin/env python3
"""
Build hlpi.json from Stats NZ Infoshare CSVs and HLC24.xlsx weights.
Run this script each quarter after new data files are downloaded.
See data-sources.md for the 5 files to download.
"""

import csv
import json
import re
from pathlib import Path
import openpyxl

DATA_DIR = Path(__file__).parent

# ── Group metadata ───────────────────────────────────────────

GROUPS = [
    {"id": "all_households",  "label": "All Households",         "category": "demographic",  "color": "#374151"},
    {"id": "beneficiaries",   "label": "Beneficiaries",          "category": "demographic",  "color": "#dc2626"},
    {"id": "maori",           "label": "Māori",                  "category": "demographic",  "color": "#059669"},
    {"id": "superannuitants", "label": "Superannuitants",        "category": "demographic",  "color": "#7c3aed"},
    {"id": "income_q1",       "label": "Income – Lowest 20%",   "category": "income",       "color": "#1e3a8a"},
    {"id": "income_q2",       "label": "Income – Q2",           "category": "income",       "color": "#1d4ed8"},
    {"id": "income_q3",       "label": "Income – Q3",           "category": "income",       "color": "#3b82f6"},
    {"id": "income_q4",       "label": "Income – Q4",           "category": "income",       "color": "#60a5fa"},
    {"id": "income_q5",       "label": "Income – Highest 20%",  "category": "income",       "color": "#93c5fd"},
    {"id": "expenditure_q1",  "label": "Spending – Lowest 20%", "category": "expenditure",  "color": "#78350f"},
    {"id": "expenditure_q2",  "label": "Spending – Q2",         "category": "expenditure",  "color": "#b45309"},
    {"id": "expenditure_q3",  "label": "Spending – Q3",         "category": "expenditure",  "color": "#d97706"},
    {"id": "expenditure_q4",  "label": "Spending – Q4",         "category": "expenditure",  "color": "#f59e0b"},
    {"id": "expenditure_q5",  "label": "Spending – Highest 20%","category": "expenditure",  "color": "#fbbf24"},
]

GROUP_ID_BY_LABEL = {g["label"]: g["id"] for g in GROUPS}

# Maps CSV header strings → internal group IDs
HLPI_GROUP_MAP = {
    "All households HLPI":        "all_households",
    "Beneficiary":                "beneficiaries",
    "Maori":                      "maori",
    "Superannuitant":             "superannuitants",
    "Income quintile 1 (low)":    "income_q1",
    "Income quintile 2":          "income_q2",
    "Income quintile 3":          "income_q3",
    "Income quintile 4":          "income_q4",
    "Income quintile 5 (high)":   "income_q5",
    "Expenditure quintile 1 (low)":"expenditure_q1",
    "Expenditure quintile 2":     "expenditure_q2",
    "Expenditure quintile 3":     "expenditure_q3",
    "Expenditure quintile 4":     "expenditure_q4",
    "Expenditure quintile 5 (high)":"expenditure_q5",
}

# Top-level spending categories (groups) — same 12 across HLPI and (11 of them) CPI
HLPI_CATEGORIES = [
    {"name": "Food",                             "id": "food"},
    {"name": "Alcoholic beverages and tobacco",  "id": "alcoholic_beverages_and_tobacco"},
    {"name": "Clothing and footwear",            "id": "clothing_and_footwear"},
    {"name": "Housing and household utilities",  "id": "housing_and_household_utilities"},
    {"name": "Household contents and services",  "id": "household_contents_and_services"},
    {"name": "Health",                           "id": "health"},
    {"name": "Transport",                        "id": "transport"},
    {"name": "Communication",                    "id": "communication"},
    {"name": "Recreation and culture",           "id": "recreation_and_culture"},
    {"name": "Education",                        "id": "education"},
    {"name": "Miscellaneous goods and services", "id": "miscellaneous_goods_and_services"},
    {"name": "Interest payments",                "id": "interest_payments"},  # HLPI only
]
CAT_ID_BY_NAME = {c["name"]: c["id"] for c in HLPI_CATEGORIES}

# CPI category map (no Interest payments)
CPI_CATEGORY_MAP = {c["name"]: c["id"] for c in HLPI_CATEGORIES if c["name"] != "Interest payments"}

# Subgroup → parent group ID
SUBGROUP_PARENTS = {
    "Fruit and vegetables":                    "food",
    "Meat, poultry and fish":                  "food",
    "Grocery food":                            "food",
    "Non-alcoholic beverages":                 "food",
    "Restaurant meals and ready-to-eat food":  "food",
    "Alcoholic beverages":                     "alcoholic_beverages_and_tobacco",
    "Cigarettes and tobacco":                  "alcoholic_beverages_and_tobacco",
    "Clothing":                                "clothing_and_footwear",
    "Footwear":                                "clothing_and_footwear",
    "Actual rentals for housing":              "housing_and_household_utilities",
    "Home ownership":                          "housing_and_household_utilities",
    "Property maintenance":                    "housing_and_household_utilities",
    "Property rates and related services":     "housing_and_household_utilities",
    "Household energy":                        "housing_and_household_utilities",
    "Furniture, furnishings and floor coverings": "household_contents_and_services",
    "Household textiles":                      "household_contents_and_services",
    "Household appliances":                    "household_contents_and_services",
    "Glassware, tableware and household utensils": "household_contents_and_services",
    "Tools and equipment for house and garden":"household_contents_and_services",
    "Other household supplies and services":   "household_contents_and_services",
    "Medical products, appliances and equipment": "health",
    "Out-patient services":                    "health",
    "Hospital services":                       "health",
    "Purchase of vehicles":                    "transport",
    "Private transport supplies and services": "transport",
    "Passenger transport services":            "transport",
    "Postal services":                         "communication",
    "Telecommunication equipment":             "communication",
    "Telecommunication services":              "communication",
    "Audio-visual and computing equipment":    "recreation_and_culture",
    "Major recreational and cultural equipment":"recreation_and_culture",
    "Other recreational equipment and supplies":"recreation_and_culture",
    "Recreational and cultural services":      "recreation_and_culture",
    "Newspapers, books and stationery":        "recreation_and_culture",
    "Accommodation services":                  "recreation_and_culture",
    "Package holidays":                        "recreation_and_culture",
    "Early childhood education":               "education",
    "Primary and secondary education":         "education",
    "Tertiary and other post school education":"education",
    "Other educational fees":                  "education",
    "Personal care":                           "miscellaneous_goods_and_services",
    "Personal effects":                        "miscellaneous_goods_and_services",
    "Insurance":                               "miscellaneous_goods_and_services",
    "Credit services":                         "miscellaneous_goods_and_services",
    "Other miscellaneous services":            "miscellaneous_goods_and_services",
    "Interest payments":                       "interest_payments",
}


# ── Quarter conversion ───────────────────────────────────────

QUARTER_MONTH = {"Q1": "Mar", "Q2": "Jun", "Q3": "Sep", "Q4": "Dec"}

def q_to_label(q):
    """'2022Q4' → 'Dec-22'"""
    return f"{QUARTER_MONTH[q[4:]]}-{q[2:4]}"


# ── CSV parsers ──────────────────────────────────────────────

def parse_simple_csv(filepath):
    """Parse a simple two-column-ish CSV (CPI All Groups or HLPI All Groups).
    Returns: (ordered_quarters, {col_header: {quarter: index_value}})
    """
    with open(filepath, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))

    headers = [h.strip() for h in rows[1]]  # row 2
    # Some files have a sub-header row 3 (e.g. 'All groups'); skip if not a quarter
    data_start = 2
    if rows[2] and not re.match(r"\d{4}Q[1-4]", rows[2][0].strip()):
        data_start = 3

    series = {h: {} for h in headers if h}
    quarters_ordered = []

    for row in rows[data_start:]:
        if not row or not re.match(r"\d{4}Q[1-4]", row[0].strip()):
            break
        q = q_to_label(row[0].strip())
        quarters_ordered.append(q)
        for i, h in enumerate(headers):
            if not h or i >= len(row):
                continue
            val = row[i].strip()
            if val:
                try:
                    series[h][q] = float(val)
                except ValueError:
                    pass

    return quarters_ordered, series


def parse_wide_csv(filepath, group_map):
    """Parse a wide HLPI CSV (Groups or Sub-Groups) with 14 household-group blocks.
    Returns: (categories, {group_id: {quarter: {category_name: index_value}}})
    """
    with open(filepath, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))

    group_header = rows[1]
    sub_header   = rows[2]

    # Locate each group block by finding non-empty cells in group_header
    positions = [(i, cell.strip()) for i, cell in enumerate(group_header)
                 if i > 0 and cell.strip()]
    block_size = positions[1][0] - positions[0][0]
    categories = [sub_header[positions[0][0] + j].strip() for j in range(block_size)]

    result = {group_map[name]: {} for _, name in positions if name in group_map}

    for row in rows[3:]:
        if not row or not re.match(r"\d{4}Q[1-4]", row[0].strip()):
            break
        q = q_to_label(row[0].strip())
        for start_col, group_name in positions:
            group_id = group_map.get(group_name)
            if not group_id:
                continue
            if q not in result[group_id]:
                result[group_id][q] = {}
            for j, cat in enumerate(categories):
                col = start_col + j
                if col < len(row) and row[col].strip():
                    try:
                        result[group_id][q][cat] = float(row[col])
                    except ValueError:
                        pass

    return categories, result


# ── Annual % change ──────────────────────────────────────────

def annual_change(index_by_q, quarters):
    """Calculate annual % change aligned to `quarters` list. Returns list."""
    results = []
    for i, q in enumerate(quarters):
        if i < 4:
            results.append(None)
        else:
            curr = index_by_q.get(q)
            prev = index_by_q.get(quarters[i - 4])
            if curr is not None and prev and prev != 0:
                results.append(round((curr / prev - 1) * 100, 2))
            else:
                results.append(None)
    return results


# ── HLC24 weights ────────────────────────────────────────────

def parse_hlc_weights(ws):
    """Return {row_id: Dec-2024 weight} from an HLC24 table sheet."""
    rows_raw = list(ws.iter_rows(values_only=True))

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

    def slugify(s):
        s = re.sub(r"[āáà]", "a", s.strip().lower())
        s = re.sub(r"[ēéè]", "e", s)
        s = re.sub(r"[ōóò]", "o", s)
        s = re.sub(r"[^a-z0-9]+", "_", s)
        return s.strip("_")

    weights = {}
    current_group_id = None
    parsing = False
    for row in rows_raw:
        name = row[0]
        if not name:
            continue
        s = str(name)
        if "Group or subgroup" in s:
            parsing = True
            continue
        if not parsing:
            continue
        if any(t in s.lower() for t in {"source", "all groups", "figures may"}):
            continue
        indent = (len(s) - len(s.lstrip())) // 4
        if indent >= 2:
            continue
        clean = s.strip()
        rid = slugify(clean)
        if indent == 0:
            current_group_id = rid
        elif indent == 1:
            rid = current_group_id + "__" + rid
        val = row[dec2024_col]
        if val is not None:
            try:
                weights[rid] = round(float(val), 4)
            except (TypeError, ValueError):
                pass
    return weights


# ── Find latest CSV by prefix ────────────────────────────────

def find_csv(prefix):
    matches = sorted(DATA_DIR.glob(f"{prefix}*.csv"))
    if not matches:
        raise FileNotFoundError(f"No CSV matching {prefix}* in {DATA_DIR}")
    return matches[-1]


# ── Main ─────────────────────────────────────────────────────

def main():
    # -- Load source files
    cpi_all_q, cpi_all_series   = parse_simple_csv(find_csv("CPI316601"))
    cpi_grp_q, cpi_grp_series   = parse_simple_csv(find_csv("CPI316701"))
    hlpi_all_q, hlpi_all_series = parse_simple_csv(find_csv("HPI512201"))
    _, hlpi_grp_data            = parse_wide_csv(find_csv("HPI512301"), HLPI_GROUP_MAP)
    subgrp_cats, hlpi_sub_data  = parse_wide_csv(find_csv("HPI512401"), HLPI_GROUP_MAP)

    hlc_wb = openpyxl.load_workbook(DATA_DIR / "HLC24.xlsx")

    # Master quarter list: union of all, sorted chronologically
    all_q_sets = [set(cpi_all_q), set(cpi_grp_q), set(hlpi_all_q)]
    master_quarters = sorted(
        set.intersection(*all_q_sets),
        key=lambda q: (int("20" + q[-2:]), {"Mar": 1, "Jun": 2, "Sep": 3, "Dec": 4}[q[:3]])
    )

    # -- CPI
    cpi_all_idx = {q: cpi_all_series.get("All groups", {}).get(q) for q in master_quarters}
    cpi_annual_all = annual_change(cpi_all_idx, master_quarters)

    cpi_annual_groups = {}
    cpi_index_groups  = {}
    for cpi_name, cat_id in CPI_CATEGORY_MAP.items():
        idx_by_q = {q: cpi_grp_series.get(cpi_name, {}).get(q) for q in master_quarters}
        cpi_annual_groups[cat_id] = annual_change(idx_by_q, master_quarters)
        cpi_index_groups[cat_id]  = [idx_by_q.get(q) for q in master_quarters]

    cpi_out = {
        "label": "CPI (headline)",
        "color": "#000000",
        "index":  {"all": [cpi_all_idx.get(q) for q in master_quarters], **cpi_index_groups},
        "annual": {"all": cpi_annual_all, **cpi_annual_groups},
    }

    # -- HLPI groups
    HLC_TABLES = {g["id"]: f"Table {i+1}" for i, g in enumerate(GROUPS)}

    groups_out = []
    for g in GROUPS:
        gid = g["id"]

        # Overall index from HPI512201
        all_col = next(
            (col for col, gid2 in [(col, HLPI_GROUP_MAP.get(col)) for col in hlpi_all_series]
             if gid2 == gid), None
        )
        all_idx_by_q = {q: hlpi_all_series.get(all_col, {}).get(q) for q in master_quarters}

        # Category-level index from HPI512301
        cat_annual = {}
        cat_index  = {}
        for cat in HLPI_CATEGORIES:
            cname, cid = cat["name"], cat["id"]
            idx_by_q = {q: hlpi_grp_data.get(gid, {}).get(q, {}).get(cname) for q in master_quarters}
            cat_annual[cid] = annual_change(idx_by_q, master_quarters)
            cat_index[cid]  = [idx_by_q.get(q) for q in master_quarters]

        # Subgroup-level index from HPI512401
        sub_annual = {}
        sub_index  = {}
        for subname in subgrp_cats:
            subid = "sub__" + re.sub(r"[^a-z0-9]+", "_", subname.strip().lower()).strip("_")
            idx_by_q = {q: hlpi_sub_data.get(gid, {}).get(q, {}).get(subname) for q in master_quarters}
            sub_annual[subid] = annual_change(idx_by_q, master_quarters)
            sub_index[subid]  = [idx_by_q.get(q) for q in master_quarters]

        # Weights from HLC24
        hlc_ws = hlc_wb[HLC_TABLES[gid]]
        weights = parse_hlc_weights(hlc_ws)

        groups_out.append({
            "id":       gid,
            "label":    g["label"],
            "category": g["category"],
            "color":    g["color"],
            "index":    {"all": [all_idx_by_q.get(q) for q in master_quarters], **cat_index,  **sub_index},
            "annual":   {"all": annual_change(all_idx_by_q, master_quarters),   **cat_annual, **sub_annual},
            "weights":  weights,
        })

    # -- Subgroups metadata (for chart rendering)
    subgroups = []
    for cat in HLPI_CATEGORIES:
        subgroups.append({"id": cat["id"], "label": cat["name"], "level": 0, "parent": None})
    for subname in subgrp_cats:
        subid = "sub__" + re.sub(r"[^a-z0-9]+", "_", subname.strip().lower()).strip("_")
        parent = SUBGROUP_PARENTS.get(subname)
        subgroups.append({"id": subid, "label": subname, "level": 1, "parent": parent})

    # -- Output
    output = {
        "generated": master_quarters[-1],
        "quarters":  master_quarters,
        "cpi":       cpi_out,
        "subgroups": subgroups,
        "groups":    groups_out,
    }

    out_path = DATA_DIR / "hlpi.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Written {out_path}")
    print(f"  Quarters: {master_quarters[0]} → {master_quarters[-1]} ({len(master_quarters)} total)")
    print(f"  CPI latest annual: {cpi_annual_all[-1]}%")
    print(f"  Groups: {len(groups_out)}, Subgroups: {len(subgroups)}")
    all_hh = next(g for g in groups_out if g["id"] == "all_households")
    print(f"  All Households latest annual: {all_hh['annual']['all'][-1]}%")


if __name__ == "__main__":
    main()
