# Decisions

## Step 1 – Setup and raw data
- **Folder layout:** `backend/` (Python) and `frontend/` (React) side by side, so each part is clear and has its own Dockerfile.
- **Looking at data:** a small Python script that saves the raw JSON and prints a summary, so it can be re-run and may become the snapshot later.
- **Python version:** pinned to 3.12 with uv, because Vercel and Docker images support it well (3.14 is too new).
- **What the data showed:** actuals are every 30 min (1584 rows, no repeats); forecasts are hourly (19,564 rows from 268 runs, mostly at 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC) and look up to ~2 days 18.5 h ahead.

## Step 2 – Decision time and picking the forecast
- **Deadline:** the day before delivery at a chosen time (default 09:50, the N2EX auction close), counting runs published *at or before* it, because that is what a trader really had.
- **Picking:** per delivery hour, the newest forecast for that hour published by the deadline. In January with 06:00–11:00 deadlines this always matches "newest run", but it never leaves an hour empty if a run is short (e.g. a 22:30 run).
- **Time zone:** treat everything as UTC, because January is GMT so UK time = UTC. Known limit: summer (BST) would need `Europe/London`.

## Step 3 – Forecast-picking function
- **Plain Python, no pandas:** data is small (~20k rows), code is easier to explain line by line, and the deploy stays light.
- **pytest:** plain `assert` tests with clear failure messages; dev-only dependency.
- **One day at a time:** `pick_forecasts(rows, day, decision_time)` returns the 24 hours, matching the Day view; the January view calls it per day.
