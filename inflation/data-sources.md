# Data sources

All data comes from Stats NZ Infoshare: stats.govt.nz/infoshare
Navigate to: **Economic indicators** then the relevant group below.

## The 5 files to download each quarter

Download after each quarterly CPI/HLPI release (published ~6 weeks after quarter end).
Drop the new CSVs into `inflation/data/`, then run `python3 inflation/data/process_data.py`.
The old CSV with the same prefix can be deleted — the processor picks up the latest file automatically.

### CPI — group: Consumers Price Index - CPI

| Infoshare dataset name | File prefix | Used for |
|---|---|---|
| CPI All Groups for New Zealand (Qrtly-Mar/Jun/Sep/Dec) | `CPI316601` | Headline CPI rate — the reference line on all charts |
| CPI Level 1 Groups for New Zealand (Qrtly-Mar/Jun/Sep/Dec) | `CPI316701` | CPI breakdown by spending category for the bar chart comparison |

### HLPI — group: Household Living-costs price Indexes - HPI

| Infoshare dataset name | File prefix | Used for |
|---|---|---|
| HLPI All groups (Qrtly-Mar/Jun/Sep/Dec) | `HPI512201` | Overall inflation rate for each of the 14 household groups |
| HLPI Groups (Qrtly-Mar/Jun/Sep/Dec) | `HPI512301` | Group-level breakdown (Food, Housing etc.) per household type |
| HLPI Sub-Groups (Qrtly-Mar/Jun/Sep/Dec) | `HPI512401` | Subgroup-level breakdown per household type |

## Other data files (don't need to update quarterly)

| File | Used for | Update when |
|---|---|---|
| `HLC24.xlsx` | HLPI expenditure weights by household group | After each Stats NZ weights review (~every 3 years) |
| `weightsmar26.xlsx` | CPI basket weights by group/subgroup/item | After each Stats NZ CPI review (~every 3 years) |
| `hlcdatadec25.xlsx` | Legacy — replaced by the three HLPI CSVs above | No longer needed |
