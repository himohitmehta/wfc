import { useState } from 'react'
import { useApi, type DayResponse, type HourRow, type Summary } from './api'
import { DayChart } from './DayChart'
import { dayName, daySentence, direction, gw, hourOf, signedGw, ukTime } from './format'

// Same pilot window as backend/src/backend/api.py
export const FIRST_DAY = '2026-01-02'
export const LAST_DAY = '2026-02-01'
export const DEFAULT_TIME = '09:50'

// Every half hour from 06:00 to 11:00, plus the 09:50 auction close
const TIMES = [...Array.from({ length: 11 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`), DEFAULT_TIME].sort()

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

type Change = Record<string, string | null>

export function DayView({ day, time, onChange }: { day: string; time: string; onChange: (c: Change) => void }) {
  const { data, error, loading, retry } = useApi<DayResponse>(`/api/day?day=${day}&decision_time=${time}`)

  return (
    <>
      <DayControls day={day} time={time} onChange={onChange} />
      {error ? (
        <div className="notice" role="alert">
          <p>Couldn't load this day: {error.message}</p>
          <button onClick={retry}>Try again</button>
        </div>
      ) : !data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div aria-busy={loading} className="results">
          <p className="muted">
            Forecast used: published {data.forecast_used.map(ukTime).join(' and ')} (UK time)
          </p>
          {data.summary ? (
            <>
              <p className="answer">
                {daySentence(data.summary.avg_forecast, data.summary.avg_actual, data.summary.bias)}
              </p>
              <DayChart hours={data.hours} />
              <NumberTiles s={data.summary} />
              <BiggestMisses hours={data.hours} />
            </>
          ) : (
            <p className="notice">Actual wind output isn't available yet for {dayName(data.day)}.</p>
          )}
        </div>
      )}
    </>
  )
}

function DayControls({ day, time, onChange }: { day: string; time: string; onChange: (c: Change) => void }) {
  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="day">Delivery day</label>
        <div className="row">
          <button aria-label="Previous day" disabled={day <= FIRST_DAY} onClick={() => onChange({ day: addDays(day, -1) })}>
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
          <button aria-label="Next day" disabled={day >= LAST_DAY} onClick={() => onChange({ day: addDays(day, 1) })}>
            ›
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="time">Decision time (day before)</label>
        <div className="row">
          <select id="time" value={time} onChange={(e) => onChange({ time: e.target.value === DEFAULT_TIME ? null : e.target.value })}>
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
      <button className="link" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Show biggest misses only' : `Show all ${hours.length} hours`}
      </button>
    </section>
  )
}
