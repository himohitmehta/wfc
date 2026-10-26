import { useState } from 'react'
import { useApi, type DayResponse, type HourRow, type Summary } from './api'
import { DayChart } from './DayChart'
import { dayName, daySentence, direction, gw, hourOf, signedGw, ukTime } from './format'
import { DEFAULT_TIME, FIRST_DAY, LAST_DAY, OLD_FORECAST_HOURS, TIMES } from './pilot'
import { LoadError, Skeleton } from './states'
import type { Change } from './url'

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const inPilot = (day: string) => FIRST_DAY <= day && day <= LAST_DAY

export function DayView({ day, time, onChange }: { day: string; time: string; onChange: (c: Change) => void }) {
  return (
    <>
      <DayControls day={day} time={time} onChange={onChange} />
      {inPilot(day) ? <DayResults day={day} time={time} /> : <OutsidePilot day={day} onChange={onChange} />}
    </>
  )
}

// Checked here instead of waiting for the API's 404, so a bad link never makes a request.
function OutsidePilot({ day, onChange }: { day: string; onChange: (c: Change) => void }) {
  return (
    <div className="notice" role="alert">
      <p>
        {dayName(day)} {day.slice(0, 4)} is outside the pilot. Delivery days run from {dayName(FIRST_DAY)} to{' '}
        {dayName(LAST_DAY)} 2026.
      </p>
      <div className="row">
        <button onClick={() => onChange({ day: FIRST_DAY })}>Go to {dayName(FIRST_DAY)}</button>
        <button onClick={() => onChange({ day: LAST_DAY })}>Go to {dayName(LAST_DAY)}</button>
      </div>
    </div>
  )
}

function DayResults({ day, time }: { day: string; time: string }) {
  const { data, error, loading, retry } = useApi<DayResponse>(`/api/day?day=${day}&decision_time=${time}`)

  if (error) return <LoadError what="this day" error={error} retry={retry} retrying={loading} />
  if (!data) return <Skeleton />

  const missing = data.missing_actuals.length
  return (
    <div aria-busy={loading} className="results">
      {data.forecast_used.length > 0 ? (
        <p className="muted">Forecast used: published {data.forecast_used.map(ukTime).join(' and ')} (UK time)</p>
      ) : (
        <p className="notice">No wind forecast had been published by {time} the day before {dayName(data.day)}.</p>
      )}
      {data.forecast_age_hours !== null && data.forecast_age_hours > OLD_FORECAST_HOURS && (
        <p className="notice warn" role="status">
          Old forecast: it was published {Math.round(data.forecast_age_hours)} hours before your {time} decision time.
          A newer run was probably missing, so the miss may look bigger than usual.
        </p>
      )}
      {missing > 0 && data.summary && (
        <p className="notice warn" role="status">
          Actual output is missing for {missing} of {missing + data.hours.length} hours (
          {data.missing_actuals.map(hourOf).join(', ')}). The numbers below use the other {data.hours.length} hours.
        </p>
      )}
      {data.summary ? (
        <>
          <p className="answer">{daySentence(data.summary.avg_forecast, data.summary.avg_actual, data.summary.bias)}</p>
          <DayChart hours={data.hours} />
          <NumberTiles s={data.summary} />
          <BiggestMisses hours={data.hours} />
        </>
      ) : (
        data.forecast_used.length > 0 && (
          <p className="notice">Actual wind output isn't available yet for {dayName(data.day)}, so there's nothing to compare.</p>
        )
      )}
    </div>
  )
}

function DayControls({ day, time, onChange }: { day: string; time: string; onChange: (c: Change) => void }) {
  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="day">Delivery day</label>
        <div className="row">
          <button aria-label="Previous day" disabled={day <= FIRST_DAY} onClick={() => onChange({ day: day > LAST_DAY ? LAST_DAY : addDays(day, -1) })}>
            ‹
          </button>
          <input
            id="day"
            type="date"
            min={FIRST_DAY}
            max={LAST_DAY}
            value={day}
            onChange={(e) => e.target.value && onChange({ day: e.target.value })}
          />
          <button aria-label="Next day" disabled={day >= LAST_DAY} onClick={() => onChange({ day: day < FIRST_DAY ? FIRST_DAY : addDays(day, 1) })}>
            ›
          </button>
        </div>
      </div>
      <TimeField time={time} onChange={onChange} />
    </div>
  )
}

/** Decision-time dropdown, shared by both views through the ?time= URL value. */
export function TimeField({ time, onChange }: { time: string; onChange: (c: Change) => void }) {
  return (
    <div className="field">
      <label htmlFor="time">Decision time (day before)</label>
      <div className="row">
        <select id="time" value={time} onChange={(e) => onChange({ time: e.target.value })}>
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {t}
              {t === DEFAULT_TIME ? ' (auction close)' : ''}
            </option>
          ))}
        </select>
        {time !== DEFAULT_TIME && <button onClick={() => onChange({ time: null })}>Reset to 09:50</button>}
      </div>
    </div>
  )
}

function NumberTiles({ s }: { s: Summary }) {
  const tiles = [
    ['Average forecast', gw(s.avg_forecast)],
    ['Average actual', gw(s.avg_actual)],
    ['Average miss', gw(s.mae), 'either way'],
    ['Direction', signedGw(s.bias), direction(s.bias)],
    ['Biggest miss', signedGw(s.biggest.error), `at ${hourOf(s.biggest.startTime)}`],
  ]
  return (
    <dl className="tiles">
      {tiles.map(([label, value, note]) => (
        <div key={label} className="tile">
          <dt>{label}</dt>
          <dd>
            {value}
            {note && <small>{note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function BiggestMisses({ hours }: { hours: HourRow[] }) {
  const [showAll, setShowAll] = useState(false)
  // top 5 by size of miss, or every hour in time order
  const rows = showAll ? hours : [...hours].sort((a, b) => Math.abs(b.error) - Math.abs(a.error)).slice(0, 5)
  return (
    <section>
      <h2>{showAll ? `All ${hours.length} hours` : 'Biggest misses'}</h2>
      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Forecast</th>
            <th scope="col">Actual</th>
            <th scope="col">Miss</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.startTime}>
              <th scope="row">{hourOf(h.startTime)}</th>
              <td>{gw(h.forecast)}</td>
              <td>{gw(h.actual)}</td>
              <td className={h.error > 0 ? 'too-high' : h.error < 0 ? 'too-low' : ''}>
                {signedGw(h.error)} <span className="muted">{direction(h.error)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button className="link" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Show biggest misses only' : `Show all ${hours.length} hours`}
      </button>
    </section>
  )
}
