# UX audit – Wind forecast check

**Audited:** Day view (`/?day=2026-01-06`) and January accuracy (`/?view=january`), after the shadcn restyle (commit `d326e9a`).
**User:** the day-ahead power buying team at a UK utility. One role. They use it to decide how much to trust tomorrow's wind forecast before the 09:50 auction, and to set a safety margin.
**Widths:** 1568 px, 924 px, 606 px (Chrome's narrowest window). A real 390 px phone was not reached.
**States:** loaded, loading (skeleton), couldn't load + Try again, outside the pilot, missing actuals (backend test only), old forecast (can't happen on January data). **Dark mode only.** Light mode was not checked.

**Verdict: NOT DONE. Score 7.3 / 10. 12 findings (3 major, 6 minor, 3 cosmetic).**

---

## Scores per framework

| Framework | Score | What lost the points |
|---|---|---|
| Usability heuristics (Krug + Nielsen) | 7 / 10 | Three words for one idea ("too high", "short", "+"), so you have to stop and think. Buttons are 32 px on phones. The planning number ignores the conditions the trader can see. |
| Design of Everyday Things | 8 / 10 | Weak signifiers. The clickable day bars and the "Show as table" links look like plain text. |
| Steve Jobs review | 7 / 10 (5 of 7 rows) | Nothing was cut this round. The January view reports accuracy but never says what to *do*. |
| **Overall** | **7.3 / 10** | |

## The One Thing

> **Tell the buyer how far to trust the wind forecast, and which way to lean, when they buy.**

The **Day view mostly delivers it**: one sentence answers "how wrong, which way". The **January view half delivers it**. It gives a symmetric ±4.2 GW band, but the forecast was **too high on 27 of 31 days** (+1.7 GW on average). Above 15 GW nearly the whole miss is that lean: +2.75 GW of a 2.77 GW average miss. The page never tells the buyer to lean.

## What already works (keep it)

- The one-sentence answer on the Day view ("…left you 2.1 GW short on average"). It's the clearest thing in the app.
- The URL keeps the state: links can be shared, Back works, and clicking a day bar opens that day.
- The "Forecast used: published …" line makes the hindsight-free rule visible.
- The two-colour gap on the chart, with words in the tooltip, tiles and table, so colour is never the only signal.
- Every failure state has a plain message and a way out (Try again, Go to 2 Jan).
- Skeleton loading, caching, and the keyboard on the chart.

---

## Findings, worst first

| # | Sev | Status | Screen | What happens | Why it matters | Framework | Fix |
|---|---|---|---|---|---|---|---|
| 1 | **3**  **Fixed** | January | The planning number is one symmetric band, "±4.2 GW", for every hour. The trader knows tomorrow's *forecast level* when buying, and the band changes a lot with it: under 5 GW ±1.9, 5–10 ±3.0, 10–15 ±2.9, **15+ ±4.7 GW**. The wind-level chart shows the *average* miss, not the band they'd plan with. | This is the number they use to size the safety margin. One band is too wide on calm days and too narrow on windy ones. | Jobs (keeps its promise?), Nielsen #2 | Show the 90% band per wind level, as a table or with the band in the tooltip and table, plus a lookup sentence: "If the forecast says 15 GW or more, plan for ±4.7 GW." |
| 2 | **3**  **Fixed** | January | The forecast leans one way: too high on 27 of 31 days, +1.7 GW on average, +2.75 GW above 15 GW. The headline only gives a ± band, so the lean sits in a small "Direction" tile. | A miss that always goes the same way can be corrected. Hiding it throws away the most useful thing in the data. | Jobs (One Thing), Krug (don't make me think) | Add a second headline line: "It usually ran high: on average actual wind was 1.7 GW below the forecast (27 of 31 days)." Tie the wind-level rows to it ("15+ GW: ran 2.8 GW high"). |
| 3 | **3**  **Fixed** | Both | One idea, three wordings: "short" (sentence), "forecast too high" (tiles and table), "+2.1 GW" (signed numbers), "over-bought" (sentence when the forecast is too low). The "+" sign follows the convention forecast − actual, which the buyer has to learn. | It makes you stop and decode the sign every time. That's exactly where a misread costs money. | Nielsen #4 consistency, Krug law 1 | Use one pair everywhere: **"too high → you were short"** / **"too low → you bought too much"**. Tiles say "2.1 GW too high" rather than "+2.1 GW". Keep the signed numbers only in the table and CSV. |
| 4 | 2  **Fixed** | Both, phone | shadcn buttons are 32 px tall (`h-8`, `size-8`), and so are the link buttons. The 40 px phone rule from 7d was lost in the restyle. | Below the 44 px tap-target guideline. ‹ › and "Show all 24 hours" are easy to miss with a thumb. | WCAG / Nielsen | At phone width, make buttons, inputs and the select at least 44 px tall (`max-sm:h-11`). |
| 5 | 2  **Fixed** | Day | The day is shown only as `06/01/2026` in the date box. There's no weekday or heading saying which day you're looking at. | Traders think in weekdays (weekend load). The "where am I" check fails once you scroll past the controls. | Krug trunk test | Add a heading above the sentence: "**Tuesday 6 January** · decided 09:50 on Monday 5 January". |
| 6 | 2  **Fixed** | Day | There's no comparison with normal. "Average miss 2.2 GW" doesn't say whether that's good or bad for January. | You can't judge one day without a reference point. | Nielsen #6 recognition over recall | Under the Average-miss tile: "January average 2.0 GW". The January data is already cached. |
| 7 | 2  **Fixed** | Both | "Show as table" and "Show all 24 hours" are link buttons in near-white bold text, no underline. They look like labels. | They're the accessible way into the data. If they're missed, keyboard and screen-reader users get only the chart. | DET signifiers | Give them link colour plus an underline, or small outline buttons with an icon (Table, ChevronDown). |
| 8 | 2  **Fixed** | January | The day bars are clickable, but the only hint is the line "Click a day to open it" above the chart. The tooltip doesn't mention it. | Hidden affordance. People hover, read, and move on. | DET affordances | Add a tooltip footer: "Click to see this day hour by hour". |
| 9 | 2  **Fixed** | January | The "Biggest miss: +6.9 GW, Monday 12 January" tile has no hour and can't be clicked. | It's the most interesting day in the month, and you have to find it on the chart yourself. | Nielsen #7 efficiency | Show the hour, and make the tile a link to that day. |
| 10 | 1  **Fixed** | Day | "Forecast used: published Mon 5 Jan, 09:30" doesn't say how fresh that was relative to the deadline. | This trust fact is buried in grey small print. | Nielsen #1 system status | "Forecast used: published Mon 5 Jan 09:30, **20 min before** your 09:50 deadline." |
| 11 | 1  **Fixed** | Day | The chart's x-axis has no time zone. | It's said on January ("UK time") but not here. | Nielsen #4 | Add "UK time" to the axis or the legend. |
| 12 | 1  **Fixed** | January | The intro line repeats the dropdown: "Forecasts available at 09:50 the day before, delivery days Friday 2 January to Sunday 1 February 2026." | More words than needed. | Krug law 3 | "Newest forecast by 09:50 the day before · 2 Jan – 1 Feb 2026". |

## Cut list (both approved and done)

| Item | Reason | Proposal |
|---|---|---|
| "Hours compared: 744" tile | The buyer doesn't act on it. It's a fact about the method, not the forecast. | **Swap** it for "Days the forecast ran high: 27 of 31", which feeds finding 2. Keep 744 in "How these numbers are worked out". |
| "Average miss by hour of day" chart | Nearly flat (1.8–2.4 GW). It barely changes a decision. | **Keep but move it below wind level**, since wind level is the actionable one. It's in the agreed design, so it isn't removed. |

## Copy rewrites

| Where | Before | After |
|---|---|---|
| Tile label (both) | Direction | Which way it missed |
| Tile value (both) | +2.1 GW / forecast too high | 2.1 GW too high / you were short |
| Tile note | either way | too high or too low |
| Day sentence, forecast low | …left you 2.1 GW over-bought on average. | …you bought 2.1 GW more than you needed, on average. |
| January headline, line 2 | (none) | It usually ran high: actual wind was 1.7 GW below the forecast on average (27 of 31 days). |
| January intro | Forecasts available at 09:50 the day before, delivery days Friday 2 January to Sunday 1 February 2026. | Newest forecast by 09:50 the day before · 2 Jan – 1 Feb 2026 |
| By-day hint | Click a day to open it. | Click a bar to see that day hour by hour. |
| Wind-level title | Average miss by forecast wind level | How far off, by what the forecast said |

## Value and positioning

- **The alternative** is Elexon's raw BMRS charts plus a spreadsheet. They show every forecast run but don't answer "which forecast could I have used at 09:50?" and give no error numbers.
- **What's unique here:** a no-hindsight forecast choice per hour, the error turned into a margin, and how that margin changes with the decision time and the wind level.
- **Riskiest assumption:** that buyers want a symmetric ± margin. The data says the miss is **skewed** (the forecast runs high), so the useful product may be "shade the forecast down by X at level Y".
- **Cheapest test:** show one buyer the wind-level table with "ran high by" next to "±" and ask which number they'd type into tomorrow's position. Five minutes.

## The path to 10/10

1. Wind-level table with the 90% band and the lean (findings 1 and 2), plus the January headline line about the lean.
2. One vocabulary for direction across tiles, sentence and table (3).
3. 44 px tap targets on phones (4).
4. Day heading with the weekday (5) and the "January average" reference on the Day tiles (6).
5. Visible signifiers for the table toggles and clickable bars (7, 8), and a clickable biggest-miss tile (9).
6. Copy polish: forecast freshness, UK time on the axis, shorter intro (10–12).
7. Check light mode and a real 390 px phone in DevTools device mode.

---

## After the fixes

All 12 findings and both cuts were applied and checked in Chrome at 1568 px (dark mode):

- **January:** the headline now has a second line about the lean ("It usually ran high … 27 of 31 days"). A new **"How far off, by what the forecast said"** table gives the band to plan for at each forecast level (±1.9 / ±3.0 / ±2.9 / ±4.7 GW) and which way it usually missed. The tiles are "Which way it missed", "Days it ran high: 27 of 31" (replacing "Hours compared") and a biggest-miss tile with **Open this day**. The by-hour chart moved to the bottom. Day-bar tooltips say "Click to see this day hour by hour". Bars and text use the same rounding, so 5 Jan shows grey and reads "about right".
- **Day:** a "Tuesday 6 January / Decided at 09:50 on Monday 5 January" heading. "Forecast used … 20 min before your 09:50 deadline". The Average-miss tile shows "January average 2.0 GW". "Hours in UK time" sits on the legend.
- **Both:** one wording, "X GW too high → you were short" / "too low → you bought too much". No signed numbers on screen; they're only in the CSV. Toggle links are always underlined and have icons. Every control is 44 px tall on phones.

**Still not verified:** light mode and a real 390 px phone. Check both with DevTools device mode before the video.
