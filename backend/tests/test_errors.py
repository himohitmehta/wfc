import json
from datetime import date, time, timedelta
from pathlib import Path

from pytest import approx

from backend.errors import compute_errors, summarise
from backend.forecast import pick_forecasts

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
FORECASTS = json.loads((RAW / "forecasts.json").read_text())
ACTUALS = {r["startTime"]: r["generation"] for r in json.loads((RAW / "actuals.json").read_text())}


def errors_for(day):
    return compute_errors(pick_forecasts(FORECASTS, day, time(9, 50)), ACTUALS)


def test_error_is_forecast_minus_actual_on_the_hour():
    picked = [{"startTime": "2026-01-06T05:00:00Z", "publishTime": "p", "generation": 100}]
    actuals = {"2026-01-06T05:00:00Z": 70, "2026-01-06T05:30:00Z": 999}
    [e] = compute_errors(picked, actuals)
    assert (e["forecast"], e["actual"], e["error"]) == (100, 70, 30)


def test_hour_without_actual_is_skipped():
    picked = [{"startTime": "2026-01-06T05:00:00Z", "publishTime": "p", "generation": 100}]
    assert compute_errors(picked, {}) == []


def test_summary_of_small_list():
    s = summarise([{"error": e} for e in [-3, 1, 2]])
    assert s["hours"] == 3
    assert s["mae"] == 2
    assert s["bias"] == 0
    assert s["max_abs"] == 3
    assert s["biggest"]["error"] == -3


def test_reference_6_jan():
    errors = errors_for(date(2026, 1, 6))
    s = summarise(errors)
    assert sum(e["actual"] for e in errors) / 24 == 9345.75
    assert s["mae"] == approx(2205.33, abs=0.01)
    assert s["biggest"]["error"] == 4316
    assert s["biggest"]["startTime"] == "2026-01-06T05:00:00Z"


def test_reference_january():
    days = [date(2026, 1, 2) + timedelta(days=d) for d in range(31)]
    s = summarise([e for day in days for e in errors_for(day)])
    assert s["hours"] == 744
    assert s["mae"] == approx(1995.57, abs=0.01)
    assert s["bias"] == approx(1727.98, abs=0.01)
    assert s["rmse"] == approx(2498.82, abs=0.01)
    assert s["p90"] == approx(4183.9, abs=0.01)
    assert s["max_abs"] == 6857
