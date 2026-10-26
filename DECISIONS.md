# Decisions

## Step 1 – Setup and raw data
- **Folder layout:** `backend/` (Python) and `frontend/` (React) side by side, so each part is clear and has its own Dockerfile.
- **Looking at data:** a small Python script that saves the raw JSON and prints a summary, so it can be re-run and may become the snapshot later.
- **Python version:** pinned to 3.12 with uv, because Vercel and Docker images support it well (3.14 is too new).
- **What the data showed:** actuals are every 30 min (1584 rows, no repeats); forecasts are hourly (19,564 rows from 268 runs, mostly at 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC) and look up to ~2 days 18.5 h ahead.
