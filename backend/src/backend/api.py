"""HTTP routes. Run: uv run uvicorn backend.api:app --reload"""

import csv
import io
from datetime import date, datetime, time, timedelta

from fastapi import FastAPI, HTTPException, Response

from backend import data
from backend.errors import compute_errors, summarise
from backend.forecast import get_deadline, pick_forecasts

# Purchase decisions made in January 2026 = delivery days 2 Jan to 1 Feb.
FIRST_DAY, LAST_DAY = date(2026, 1, 2), date(2026, 2, 1)
DAYS = [FIRST_DAY + timedelta(days=d) for d in range((LAST_DAY - FIRST_DAY).days + 1)]
EARLIEST, LATEST = time(6, 0), time(11, 0)
DEFAULT_TIME = time(9, 50)  # N2EX day-ahead auction close

app = FastAPI(title="Wind forecast check")


def check_decision_time(decision_time):
    if not EARLIEST <= decision_time <= LATEST:
        raise HTTPException(422, f"decision_time must be between {EARLIEST:%H:%M} and {LATEST:%H:%M}")


def day_errors(day, decision_time):
    return compute_errors(pick_forecasts(data.forecasts(), day, decision_time), data.actuals())


def summary_or_none(errors):
    # p90 needs at least 2 hours; fewer means actuals are missing
    return summarise(errors) if len(errors) >= 2 else None


def grouped(errors, key):
    """Summary per group, e.g. per day or per hour of day, sorted by group."""
    groups = {}
    for e in errors:
        groups.setdefault(key(e), []).append(e)
    return [{"group": k, "summary": summary_or_none(groups[k])} for k in sorted(groups)]


def wind_level(e):
    """Lower edge in GW of the forecast's band: 0, 5, 10 or 15 (15 means 15 GW and over)."""
    return min(e["forecast"] // 5000 * 5, 15)


@app.get("/api/day")
def day_view(day: date, decision_time: time = DEFAULT_TIME):
    if not FIRST_DAY <= day <= LAST_DAY:
        raise HTTPException(404, f"day must be between {FIRST_DAY} and {LAST_DAY}")
    check_decision_time(decision_time)
    picked = pick_forecasts(data.forecasts(), day, decision_time)
    errors = compute_errors(picked, data.actuals())
    deadline = get_deadline(day, decision_time)
    publish_times = sorted({p["publishTime"] for p in picked})
    oldest = datetime.fromisoformat(publish_times[0]) if publish_times else None
    return {
        "day": day,
        "decision_time": decision_time,
        "deadline": deadline,
        "forecast_used": publish_times,
        "forecast_age_hours": (deadline - oldest).total_seconds() / 3600 if oldest else None,
        "hours": errors,
        "missing_actuals": [p["startTime"] for p in picked if p["startTime"] not in data.actuals()],
        "summary": summary_or_none(errors),
    }


def january_errors(decision_time):
    return [e for day in DAYS for e in day_errors(day, decision_time)]


@app.get("/api/january")
def january_view(decision_time: time = DEFAULT_TIME):
    check_decision_time(decision_time)
    errors = january_errors(decision_time)
    return {
        "decision_time": decision_time,
        "first_day": FIRST_DAY,
        "last_day": LAST_DAY,
        "summary": summary_or_none(errors),
        # a delivery hour 00:00 on 6 Jan belongs to delivery day 6 Jan
        "by_day": grouped(errors, lambda e: e["startTime"][:10]),
        "by_hour": grouped(errors, lambda e: e["startTime"][11:16]),
        "by_wind_level_gw": grouped(errors, wind_level),
    }


@app.get("/api/january.csv")
def january_csv(decision_time: time = DEFAULT_TIME):
    check_decision_time(decision_time)
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=["startTime", "publishTime", "forecast", "actual", "error"])
    writer.writeheader()
    writer.writerows(january_errors(decision_time))
    return Response(
        out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wind-forecast-errors-january-2026.csv"},
    )
