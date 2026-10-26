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

## Step 4 – Error numbers
- **Actual on the hour:** pair each hourly forecast with the half-hour actual that starts on the hour (05:00, not 05:30), because it's an exact match and agrees with the reference results. Averaging 05:00+05:30 was the other option (MAE 2013 vs 1996 MW).
- **90% band:** `statistics.quantiles(method="inclusive")`, the same as numpy and Excel `PERCENTILE.INC`, so anyone can check it in a spreadsheet.
- **Sign:** error = forecast − actual, so positive means the forecast was too high and buying to it left you short. Caveat: curtailment can make forecasts look too high.

## Step 5 – Snapshot vs live data
- **Snapshot file:** the app reads a saved copy of Elexon's January data, loaded once per server start. January 2026 is history, so this is fast, works when Elexon is down, and tests and site use the same numbers. Refresh with `scripts/fetch_raw.py`. Would switch to live + snapshot fallback if scope became "every day from now on".
- **Raw JSON kept as-is:** 2.8 MB is small enough, and anyone can compare it with the Elexon links. Snapshot taken 2026-10-26.

## Step 6 – FastAPI routes
- **One route per screen:** `/api/day`, `/api/january`, `/api/january.csv`. Each screen makes one call and all maths stays in tested Python. Backend sends plain MW; frontend formats GW and wording.
- **Wind level grouped by forecast:** it's what the trader knows at 09:50, so the table reads "when the forecast says 15+ GW, expect a miss of ~2.8 GW" (vs ~1.3 GW under 5 GW).
- **Odd requests:** FastAPI types check `date`/`time`; day outside 2 Jan–1 Feb → 404, decision time outside 06:00–11:00 → 422, missing actuals → 200 with `summary: null` and a `missing_actuals` list. Each maps to a screen state.

## Step 7a – Frontend setup
- **Vite + React + TypeScript:** standard fast setup; types catch wrong API field names before the browser does.
- **Recharts** for the chart (React-shaped, dashed lines, shaded band, keyboard support) – installed in 7b.
- **View state in the URL** (`?view=january&day=…&time=…`) with plain `URLSearchParams`: links can be shared and Back works, no router needed for two views.
- **One plain CSS file** with colour variables and a dark-mode media query; no CSS framework.
- **Dev proxy:** Vite forwards `/api` to FastAPI on :8000, so no CORS.

## Step 7b – Day view
- **Day picker:** native date box limited to 2 Jan–1 Feb plus ‹ › buttons: phones get a native picker, stepping days is fast, works by keyboard.
- **Gap shading in two colours:** orange where the forecast was too high (you were short), teal where too low. Colour is never the only signal: tooltip, tiles and table say "forecast too high/low" in words.
- **GW with 1 decimal everywhere:** matches the one-sentence answer and is easy to say; exact MW stays in the CSV.
- **Sentence uses bias, tiles show both:** "left you 2.1 GW short on average" is the direction (bias); "Average miss" tile is the size either way (MAE).
