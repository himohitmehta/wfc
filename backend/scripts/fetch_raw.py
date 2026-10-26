"""Download raw Elexon wind data and print its shape. Run: uv run python scripts/fetch_raw.py"""

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen

ACTUALS_URL = (
    "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
    "?settlementDateFrom=2026-01-01&settlementDateTo=2026-02-02&fuelType=WIND"
)
FORECASTS_URL = (
    "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
    "?publishDateTimeFrom=2025-12-29T00:00:00Z&publishDateTimeTo=2026-01-31T11:00:00Z"
)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def download(url, filename):
    with urlopen(url, timeout=60) as response:
        rows = json.load(response)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DIR / filename).write_text(json.dumps(rows, indent=1))
    return rows


def summarise(name, rows):
    starts = [r["startTime"] for r in rows]
    print(f"\n== {name} ==")
    print("type:", type(rows).__name__, "| rows:", len(rows))
    print("keys:", list(rows[0].keys()))
    print("first row:", rows[0])
    print("startTime range:", min(starts), "->", max(starts))
    print("startTime minutes past the hour:", Counter(s[14:16] for s in starts))


def parse(ts):
    return datetime.fromisoformat(ts)


if __name__ == "__main__":
    actuals = download(ACTUALS_URL, "actuals.json")
    forecasts = download(FORECASTS_URL, "forecasts.json")

    summarise("actuals (FUELHH)", actuals)
    starts = Counter(r["startTime"] for r in actuals)
    print("repeated startTimes:", sum(1 for c in starts.values() if c > 1))

    summarise("forecasts (WINDFOR)", forecasts)
    publishes = {r["publishTime"] for r in forecasts}
    print("different publishTimes:", len(publishes))
    print("publish time of day:", Counter(p[11:16] for p in publishes).most_common(10))
    ahead = [parse(r["startTime"]) - parse(r["publishTime"]) for r in forecasts]
    print("look-ahead: min", min(ahead), "| max", max(ahead))
