# Wind forecast check

A web app for a UK energy utility's day-ahead power buying team. Using only national wind data from Elexon, it shows:

1. **The forecast they actually had** when they made their day-ahead buying decision. That's the newest wind forecast published before the auction closed, chosen hour by hour, with no hindsight.
2. **How accurate that forecast was**, in numbers they can plan with. That means how far off it was, which way it leaned, and how that changes with the wind level.

Scope: purchase decisions made in January 2026, which means delivery days **2 Jan – 1 Feb 2026**.

**Live app:** _added after deploy_

---

## What it found (decision at 09:50, the N2EX auction close)

- **In 9 of every 10 hours, actual wind was within ±4.2 GW of the forecast.** The average miss was 2.0 GW across 744 hours.
- **The forecast ran high on 27 of 31 days.** On average actual wind came in 1.7 GW below the forecast, so buying to the forecast usually left you short.
- **The windier the forecast, the bigger the miss.** When the forecast said 15 GW or more, plan for ±4.7 GW. In those hours it ran 2.8 GW high on average.
- **Caveat:** Elexon actuals are metered output. When wind farms are told to turn down (curtailment), metered output drops, so the forecast can look too high. 12 Jan is a clear example.

## How it works

| Question | Answer used in the app |
|---|---|
| When is the decision made? | The day before delivery, at a time you choose (06:00–11:00). The default is **09:50**, the N2EX day-ahead auction close. January is GMT, so UK time = UTC. |
| Which forecast counts? | For **each delivery hour**, the newest Elexon `WINDFOR` forecast published **at or before** that time. |
| What is it compared with? | Elexon `FUELHH` wind output for the half hour that **starts on that hour**. Forecasts are hourly, actuals half-hourly. |
| Miss | forecast − actual. Positive means the forecast was too high, so you were short. |
| Numbers | Average miss (MAE), which way it missed (bias), RMSE, the 90% band (P90 of the miss size, same as Excel `PERCENTILE.INC`), and the biggest miss. |

Every choice and its reason is in [`DECISIONS.md`](DECISIONS.md). A UX review of the screens is in [`docs/ux-audit.md`](docs/ux-audit.md).

## Screens

- **Day view:** pick a delivery day and decision time. It shows which forecast you'd have used, a one-sentence answer ("The forecast said 11.5 GW of wind. It was 9.3 GW. Buying to this forecast left you 2.1 GW short on average."), the numbers compared with January, an hour-by-hour chart (hover, tap or use the arrow keys), and the biggest misses.
- **January accuracy:** the planning number, which way it leaned, a "plan for ±X" table by forecast wind level, the average miss by day (click a day to open it) and by hour, how the numbers are worked out, and a CSV download.
- **States:** loading, couldn't load (with Try again), a day outside the pilot, missing actuals, and an old-forecast warning. Works at phone width and with the keyboard. Follows the device's light or dark mode. Every view has a shareable URL, for example `/?day=2026-01-06&time=08:00`.

## Files and folders

```text
├── backend/                  Python 3.12, FastAPI, managed with uv
│   ├── data/raw/             Snapshot of the two Elexon datasets (taken 2026-10-26)
│   ├── scripts/fetch_raw.py  Re-downloads the snapshot and prints its shape
│   ├── src/backend/
│   │   ├── forecast.py       Picks the newest forecast per hour before the deadline
│   │   ├── errors.py         Pairs forecast with actual; MAE, bias, RMSE, P90, biggest miss
│   │   ├── data.py           Loads the snapshot once per server process
│   │   └── api.py            Routes: /api/day, /api/january, /api/january.csv
│   └── tests/                pytest: picking rules, error numbers vs reference results, API
├── frontend/                 React 19, TypeScript, Vite, shadcn/ui, Tailwind, Recharts
│   └── src/
│       ├── App.tsx           Tabs; the URL is the source of truth (nuqs)
│       ├── DayView.tsx       Day view
│       ├── JanuaryView.tsx   January accuracy view
│       ├── DayChart.tsx      Forecast vs actual chart
│       ├── api.ts            API types and fetching (React Query, cached)
│       ├── format.ts         All GW formatting and wording
│       └── components/ui/    shadcn components (generated)
├── docs/ux-audit.md          UX audit and what was fixed
├── Dockerfile                One container: builds the frontend, serves it with the API
├── vercel.json               Vercel Services: /api -> backend, everything else -> frontend
└── DECISIONS.md              Every decision and why
```

## How to run

You need [uv](https://docs.astral.sh/uv/) and Node 20 or later.

```bash
# Backend: http://localhost:8000 (API docs at /docs)
cd backend
uv run uvicorn backend.api:app --reload

# Frontend: http://localhost:5173 (forwards /api to the backend)
cd frontend
npm install
npm run dev
```

Tests and checks:

```bash
cd backend && uv run pytest          # checks the numbers against the reference results
cd frontend && npm run build && npm run lint
```

Refresh the data snapshot from Elexon (no API key needed):

```bash
cd backend && uv run python scripts/fetch_raw.py
```

**Docker** (one container: FastAPI serves the API and the built React app):

```bash
docker build -t wind-forecast .
docker run --rm -p 8000:8000 wind-forecast   # open http://localhost:8000
```

**Deploy:** Vercel, one project with two [Services](https://vercel.com/docs/services) (see `vercel.json`): `/api/*` goes to the FastAPI service in `backend/`, and everything else to the Vite build in `frontend/`. Pushing to `master` deploys to production.

## Data sources

- Actuals: [Elexon BMRS `FUELHH`](https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-02-02&fuelType=WIND), wind only, every 30 minutes.
- Forecasts: [Elexon BMRS `WINDFOR`](https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2025-12-29T00:00:00Z&publishDateTimeTo=2026-01-31T11:00:00Z), hourly, published several times a day.

## AI tools used

This project was built with **Claude Code** (Anthropic) as a step-by-step mentor and pair programmer. At each step it explained the options, I made the decision (recorded in `DECISIONS.md`), and it helped write and review the code, tests and this README. It also used Mobbin (through its MCP server) to find UI patterns from real dashboards, and the shadcn CLI to add components. Every number was checked against independent reference results in the tests.
