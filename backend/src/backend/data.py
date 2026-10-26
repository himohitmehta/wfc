"""Frozen copy of Elexon's January 2026 wind data. Refresh with: uv run python scripts/fetch_raw.py"""

import json
from functools import cache
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parents[2] / "data" / "raw"


@cache  # read the files once per server process, then reuse
def forecasts():
    return json.loads((RAW_DIR / "forecasts.json").read_text())


@cache
def actuals():
    """startTime -> MW, ready for compute_errors."""
    rows = json.loads((RAW_DIR / "actuals.json").read_text())
    return {r["startTime"]: r["generation"] for r in rows}
