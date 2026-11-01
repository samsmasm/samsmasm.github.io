#!/usr/bin/env python3
"""Fetch daily market data for /hasitpopped and write data.json.

Stdlib only. Run by .github/workflows/hasitpopped.yml after the US close.
Sources: Yahoo Finance chart API (prices) and FRED CSV (credit spread, rates).
The page computes every traffic light itself, so thresholds live in app.js.
"""
import csv, io, json, math, statistics, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone, date
from pathlib import Path

OUT = Path(__file__).with_name("data.json")
UA = {"User-Agent": "Mozilla/5.0 (hasitpopped; unisam.nz)", "Accept": "*/*"}
START = "2023-01-01"   # ChatGPT era: the AI index is rebased to 100 here

# name, layer. Layer order is display order.
STOCKS = {
    "NVDA": ("Nvidia", "Chips"), "AMD": ("AMD", "Chips"), "AVGO": ("Broadcom", "Chips"),
    "TSM": ("TSMC", "Chips"), "ASML": ("ASML", "Chips"), "MU": ("Micron", "Chips"),
    "INTC": ("Intel", "Chips"), "ARM": ("Arm", "Chips"),
    "MSFT": ("Microsoft", "Hyperscalers"), "GOOGL": ("Alphabet", "Hyperscalers"),
    "AMZN": ("Amazon", "Hyperscalers"), "META": ("Meta", "Hyperscalers"),
    "ORCL": ("Oracle", "Hyperscalers"),
    "CRWV": ("CoreWeave", "Neoclouds & power"), "NBIS": ("Nebius", "Neoclouds & power"),
    "SMCI": ("Super Micro", "Neoclouds & power"), "VRT": ("Vertiv", "Neoclouds & power"),
    "CEG": ("Constellation", "Neoclouds & power"), "VST": ("Vistra", "Neoclouds & power"),
    "PLTR": ("Palantir", "Software & labs"), "SPCX": ("SpaceX (xAI)", "Software & labs"),
    "000660.KS": ("SK Hynix", "Asia"), "005930.KS": ("Samsung", "Asia"),
    "9984.T": ("SoftBank", "Asia"),
}
LAYERS = ["Chips", "Hyperscalers", "Neoclouds & power", "Software & labs", "Asia"]
SECTORS = ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"]
BENCH = ["^GSPC", "QQQ", "RSP", "SMH", "^VXN", "^VIX"] + SECTORS
FRED = {"hy": "BAMLH0A0HYM2", "us10y": "DGS10", "fedfunds": "DFF"}


def get(url, tries=3, headers=UA):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
                return r.read().decode()
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)


def yahoo(sym):
    """Return {iso_date: adjusted close} for ~6 years of daily data."""
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}"
           "?range=6y&interval=1d&events=div%2Csplit")
    res = json.loads(get(url))["chart"]["result"][0]
    ts = res.get("timestamp") or []
    q = res["indicators"]
    closes = (q.get("adjclose") or [{}])[0].get("adjclose") or q["quote"][0]["close"]
    off = res["meta"].get("gmtoffset", 0)
    out = {}
    for t, c in zip(ts, closes):
        if c is not None and c > 0:
            out[datetime.fromtimestamp(t + off, timezone.utc).date().isoformat()] = c
    return dict(sorted(out.items())), res["meta"].get("currency", "USD")


def fred(series):
    text = get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}&cosd=2021-01-01",
               headers={"User-Agent": "curl/8.5.0", "Accept": "*/*"})  # FRED stalls browser-like UAs
    out = {}
    for row in csv.reader(io.StringIO(text)):
        if len(row) == 2 and row[0][:2] in ("19", "20") and row[1] not in ("", "."):
            out[row[0]] = float(row[1])
    return out


def pct(a, b):
    return None if a is None or b in (None, 0) else round((a / b - 1) * 100, 2)


def r(x, n=2):
    return None if x is None else round(x, n)


def sig(x, n=4):
    """Round to n significant figures (keeps the JSON small)."""
    if not x:
        return x
    return round(x, max(0, n - 1 - int(math.floor(math.log10(abs(x))))))


def stats(series, spx):
    d = list(series.keys())
    c = list(series.values())
    n = len(c)
    last = c[-1]

    def back(k):
        return c[-1 - k] if n > k else None

    peak_i = max(range(n), key=lambda i: c[i])
    ma = lambda k: statistics.fmean(c[-k:]) if n >= k else None
    ma50, ma200 = ma(50), ma(200)
    prev_year = [v for k, v in series.items() if k < f"{d[-1][:4]}-01-01"]
    rets = [math.log(c[i] / c[i - 1]) for i in range(max(1, n - 21), n)]
    vol = statistics.stdev(rets) * math.sqrt(252) * 100 if len(rets) > 5 else None
    chg3m = pct(last, back(63))
    spx3m = pct(list(spx.values())[-1], list(spx.values())[-64])
    days_since = (date.fromisoformat(d[-1]) - date.fromisoformat(d[peak_i])).days
    low52 = min(c[-252:])
    return {
        "last": sig(last, 5), "date": d[-1],
        "d1": pct(last, back(1)), "w1": pct(last, back(5)), "m1": pct(last, back(21)),
        "m3": chg3m, "ytd": pct(last, prev_year[-1]) if prev_year else None,
        "y1": pct(last, back(252)),
        "peak": sig(c[peak_i], 5), "peakDate": d[peak_i], "fromPeak": pct(last, c[peak_i]),
        "daysSincePeak": days_since, "fromLow52": pct(last, low52),
        "vs200": pct(last, ma200), "vs50": pct(last, ma50),
        "deathCross": None if ma200 is None else ma50 < ma200,
        "vol": r(vol, 1), "rel3m": None if chg3m is None or spx3m is None else r(chg3m - spx3m),
        "listed": d[0] if d[0] > "2021-02-01" else None,
        "spark": [sig(v) for v in c[-252:]],
    }


def align(series, dates):
    """Forward-fill a series onto a date grid (None before it starts)."""
    out, last, keys, j = [], None, list(series.keys()), 0
    for dt in dates:
        while j < len(keys) and keys[j] <= dt:
            last = series[keys[j]]
            j += 1
        out.append(last)
    return out


def ew_index(cols):
    """Equal-weight chain-linked index from aligned price columns, base 100."""
    idx, level = [], 100.0
    for i in range(len(cols[0])):
        if i:
            rs = [col[i] / col[i - 1] - 1 for col in cols
                  if col[i] is not None and col[i - 1] is not None]
            if rs:
                level *= 1 + statistics.fmean(rs)
        idx.append(level)
    return idx


def drawdown(xs):
    out, peak = [], None
    for x in xs:
        if x is None:
            out.append(None)
            continue
        peak = x if peak is None else max(peak, x)
        out.append(round((x / peak - 1) * 100, 2))
    return out


def above200(cols, i):
    """Share of columns trading above their own 200-day average on day i."""
    up = tot = 0
    for col in cols:
        w = col[i - 199:i + 1] if i >= 199 else []
        if len(w) == 200 and all(v is not None for v in w):
            tot += 1
            up += col[i] > statistics.fmean(w)
    return round(up / tot * 100, 1) if tot else None


def main():
    prices, ccy, errors = {}, {}, []
    for sym in list(STOCKS) + BENCH:
        try:
            prices[sym], ccy[sym] = yahoo(sym)
        except Exception as e:
            errors.append(f"{sym}: {e}")
        time.sleep(0.4)
    if "^GSPC" not in prices or len(errors) > 8:
        sys.exit("Too many fetch failures:\n" + "\n".join(errors))

    spx = prices["^GSPC"]
    grid = [d for d in spx if d >= START]
    grid_all = list(spx)  # longer grid so 200-day averages exist from START

    stocks = []
    for sym, (name, layer) in STOCKS.items():
        if sym in prices and len(prices[sym]) > 30:
            s = stats(prices[sym], spx)
            s.update(sym=sym, name=name, layer=layer, ccy=ccy[sym])
            stocks.append(s)

    us = [s for s in STOCKS if STOCKS[s][1] != "Asia" and s in prices]
    cols_all = {s: align(prices[s], grid_all) for s in prices}
    off = grid_all.index(grid[0])
    cols = {s: v[off:] for s, v in cols_all.items()}

    ai = ew_index([cols[s] for s in us])
    layers = {L: ew_index([cols[s] for s in STOCKS if STOCKS[s][1] == L and s in cols])
              for L in LAYERS}
    spx_idx = [v / cols["^GSPC"][0] * 100 for v in cols["^GSPC"]]

    ratio = [q / e if q and e else None for q, e in zip(cols["QQQ"], cols["RSP"])]
    breadth_ai = [above200([cols_all[s] for s in us], i + off) for i in range(len(grid))]
    breadth_sec = [above200([cols_all[s] for s in SECTORS if s in cols_all], i + off)
                   for i in range(len(grid))]

    fred_data = {}
    for key, sid in FRED.items():
        try:
            fred_data[key] = fred(sid)
        except Exception as e:
            errors.append(f"FRED {sid}: {e}")
    hy = align(fred_data.get("hy", {}), grid) if fred_data.get("hy") else [None] * len(grid)

    def last_of(series):
        if not series:
            return None
        k = list(series)[-1]
        return {"value": series[k], "date": k}

    data = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "asOf": grid[-1],
        "dates": grid,
        "series": {
            "ai": [r(v) for v in ai],
            "spx": [r(v) for v in spx_idx],
            "layers": {L: [r(v) for v in xs] for L, xs in layers.items()},
            "aiDrawdown": drawdown(ai),
            "leaders": drawdown(ratio),
            "breadthAI": breadth_ai,
            "breadthSectors": breadth_sec,
            "vxn": [r(v) for v in cols.get("^VXN", [None] * len(grid))],
            "hy": hy,
            "aiVs200": [pct(ai[i], statistics.fmean(ai[i - 199:i + 1])) if i >= 199 else None
                        for i in range(len(ai))],
        },
        "stocks": stocks,
        "bench": {s: stats(prices[s], spx) for s in ["^GSPC", "QQQ", "RSP", "SMH"] if s in prices},
        "macro": {
            "us10y": last_of(fred_data.get("us10y")),
            "fedfunds": last_of(fred_data.get("fedfunds")),
            "vix": {"value": r(list(prices["^VIX"].values())[-1]), "date": list(prices["^VIX"])[-1]}
                   if "^VIX" in prices else None,
        },
        "errors": errors,
    }
    for b in data["bench"].values():
        b.pop("spark", None)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB), {len(stocks)} stocks, errors: {errors}")


if __name__ == "__main__":
    main()
