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

## Step 7c – January accuracy view
- **Bar chart per breakdown + "Show as table":** patterns are visible at a glance (windy days, 15 GW+ misses); the table gives exact numbers and keyboard/screen-reader access. Clicking a day bar (or its table row) opens that day.
- **Bar = average miss, colour = direction:** one number per bar; orange = forecast mostly too high, teal = too low, same meaning as the Day view. Bias is in the tooltip and table.
- **Decision time shared with the Day view** via `?time=`: shows how accuracy changes if you decide earlier, and both views never silently disagree.
- **shadcn/ui later, not now:** finish and test all features first (7d), then restyle with shadcn + Tailwind as one separate polish step before deploy, so it can be skipped if hours run short. Keep the native date box (better on phones).

## Step 7d (part 1) – Fetching, URL state, caching
- **React Query** for fetching: cached per URL (`staleTime: Infinity`, data is frozen), retries network/5xx errors but not our 4xx answers, keeps the old day on screen while the next loads. Replaces our hand-written hook.
- **nuqs** for URL state: `view`, `day`, `time` are typed and checked; unknown times fall back to 09:50, defaults are left out of the URL, Back works. A real date outside the pilot is kept so the page can say so.
- **HTTP cache:** successful API answers send `Cache-Control: public, max-age=86400` so browsers and Vercel's CDN can reuse them; errors are never cached.

## Step 7d (part 2) – States, phone width, keyboard
- **Loading:** grey skeleton boxes in the shape of the results on first load (page doesn't jump); faded old content while switching. Pulse animation off for reduced-motion users.
- **Old forecast warning:** shown when the forecast used is more than 3 h older than the decision time (morning runs come every 2–3 h, so a missing run). Never fires on January data – oldest used is 2.5 h – it's a safety net.
- **Outside the pilot:** checked in the browser before any request; clear message plus "Go to 2 Jan / 1 Feb" buttons, never a silent jump to another day.
- **Couldn't load:** React Query retries twice, then a plain-English message with "Try again". **Missing actuals:** a note listing the missing hours, numbers use the rest.
- **Keyboard:** Recharts' built-in layer – Tab to the chart, arrow keys move between hours. Known limit: the chart's focus box has no spoken name; the "Show all 24 hours" table is the screen-reader alternative.

## shadcn restyle (polish step)
- **shadcn/ui (Radix base, "nova" style) + Tailwind v4:** consistent, accessible components – Tabs, Button, Card, Table, Alert, Skeleton, Collapsible, Input. Behaviour, URLs and numbers unchanged.
- **NativeSelect for decision time, native date box kept:** phones get their own pickers; both styled like shadcn.
- **Charts stay our tested Recharts code**, only recoloured with theme variables (`--short`, `--long`, `--forecast`, `--actual`) so they match light and dark.
- **Dark mode follows the device** (`prefers-color-scheme`), no toggle; `color-scheme: light dark` so native controls match.

## UX audit fixes (docs/ux-audit.md)
- **Plan by forecast level:** the 90% band depends on tomorrow's forecast (±1.9 GW under 5 GW, ±4.7 GW at 15 GW+), so January shows a "Plan for" table by wind level instead of one band.
- **Show the lean:** the forecast ran high on 27 of 31 days (+1.7 GW; +2.8 GW at 15 GW+), so the headline says so – a one-way miss can be corrected.
- **One wording for direction:** "X GW too high → you were short" / "too low → you bought too much"; no +/− signs on screen (CSV keeps them).
- **Cuts:** "Hours compared" tile swapped for "Days it ran high"; by-hour chart moved below the planning table.

## UI patterns from Mobbin (Squarespace, Whop, Databricks, OpenAI, LangChain)
- **Numbers on top of the chart in one panel:** read order is sentence → numbers → the picture behind them.
- **"vs January" badge** on the day's average miss: orange = worse than usual, teal = better.
- **"Forecast published …" chip** on the chart panel: the hindsight-free rule is the main trust fact, so it's no longer small print.
- **Dashed January-average line** on the by-day and by-hour charts, so unusual days stand out without reading numbers.
- **Each chart/table in its own card** with a title and one-line subtitle.

## Step 8 – Faster first load, Docker, Vercel
- **Lazy loading:** each view and Recharts are separate chunks; the page shell and the day's numbers (~110 kB gz) paint before Recharts (~97 kB gz) arrives; hovering a tab preloads its chunk. Was one 222 kB gz file. Font subsets left alone – `unicode-range` means only the Latin file is ever downloaded.
- **Vercel Services (one project):** `/api/*` → FastAPI service (`backend/`, entrypoint `src.backend.api:app`), everything else → Vite service (`frontend/`). Same site, no CORS; the API's 1-day cache header lets the CDN answer repeat requests. Services is beta but on all plans.
- **One Docker container:** multi-stage build (Node builds React, Python 3.12 + uv runs FastAPI); FastAPI serves the built React app only when `FRONTEND_DIST` is set, so Vercel and local dev are unchanged.
- **Cache header only on `/api/`:** a cached `index.html` would show an old page after a redeploy.

## Phone-width fixes (checked at 360, 390 and 768 px)
- Number strip: an odd last tile spans both columns on phones, so there's no empty cell; values are one size smaller on phones so "6.9 GW too high" fits on one line.
- Chart hour labels skip as needed instead of colliding; "too high/too low" cells wrap instead of being cut off.
- Planning table on phones keeps the three columns a buyer needs (forecast level, band, lean); "Average miss" and "Hours" show from tablet width up.
