from datetime import UTC, datetime, timedelta


def get_deadline(day, decision_time):
    """The day before `day` at `decision_time`, UTC (January is GMT, so UK time = UTC)."""
    return datetime.combine(day - timedelta(days=1), decision_time, tzinfo=UTC)


def pick_forecasts(rows, day, decision_time):
    """For each hour of `day`, the newest forecast published at or before the deadline."""
    deadline = get_deadline(day, decision_time).strftime("%Y-%m-%dT%H:%M:%SZ")
    prefix = day.isoformat()  # startTime on `day` begins with "2026-01-06"
    newest = {}
    # Same-format ISO strings sort like the times they hold, so plain string compares are safe.
    for r in rows:
        if r["startTime"].startswith(prefix) and r["publishTime"] <= deadline:
            kept = newest.get(r["startTime"])
            if kept is None or r["publishTime"] > kept["publishTime"]:
                newest[r["startTime"]] = r
    return [newest[s] for s in sorted(newest)]
