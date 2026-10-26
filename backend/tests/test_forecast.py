import json
from datetime import date, time
from pathlib import Path

from backend.forecast import pick_forecasts

DAY = date(2026, 1, 6)
RAW = Path(__file__).resolve().parent.parent / "data" / "raw" / "forecasts.json"


def row(publish, start, mw):
    return {"publishTime": publish, "startTime": start, "generation": mw}


def test_run_published_exactly_at_deadline_is_used():
    rows = [
        row("2026-01-05T07:30:00Z", "2026-01-06T00:00:00Z", 100),
        row("2026-01-05T09:30:00Z", "2026-01-06T00:00:00Z", 200),
    ]
    [picked] = pick_forecasts(rows, DAY, time(9, 30))
    assert picked["generation"] == 200


def test_run_published_after_deadline_is_ignored():
    rows = [
        row("2026-01-05T09:30:00Z", "2026-01-06T00:00:00Z", 200),
        row("2026-01-05T11:30:00Z", "2026-01-06T00:00:00Z", 300),
    ]
    [picked] = pick_forecasts(rows, DAY, time(9, 50))
    assert picked["generation"] == 200


def test_missing_hour_falls_back_to_older_run():
    rows = [
        row("2026-01-05T07:30:00Z", "2026-01-06T00:00:00Z", 100),
        row("2026-01-05T07:30:00Z", "2026-01-06T01:00:00Z", 110),
        row("2026-01-05T09:30:00Z", "2026-01-06T00:00:00Z", 200),
    ]
    picked = pick_forecasts(rows, DAY, time(9, 50))
    assert [(p["startTime"][11:16], p["publishTime"][11:16]) for p in picked] == [
        ("00:00", "09:30"),
        ("01:00", "07:30"),
    ]


def test_hours_outside_the_day_are_left_out():
    rows = [
        row("2026-01-05T09:30:00Z", "2026-01-05T23:00:00Z", 1),
        row("2026-01-05T09:30:00Z", "2026-01-07T00:00:00Z", 2),
    ]
    assert pick_forecasts(rows, DAY, time(9, 50)) == []


def test_real_data_6_jan():
    picked = pick_forecasts(json.loads(RAW.read_text()), DAY, time(9, 50))
    assert len(picked) == 24
    assert {p["publishTime"] for p in picked} == {"2026-01-05T09:30:00Z"}
    assert sum(p["generation"] for p in picked) / 24 == 11464.5
