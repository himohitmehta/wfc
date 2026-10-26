import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Rectangle, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { useApi, type Group, type JanuaryResponse, type Summary } from './api'
import { TimeField } from './DayView'
import { dayName, direction, gw, signedGw } from './format'
import type { Change } from './url'

const WIND_LEVELS: Record<number, string> = { 0: 'Under 5 GW', 5: '5–10 GW', 10: '10–15 GW', 15: '15 GW and over' }

export function JanuaryView({ time, onChange }: { time: string; onChange: (c: Change) => void }) {
  const { data, error, loading, retry } = useApi<JanuaryResponse>(`/api/january?decision_time=${time}`)

  return (
    <>
      <div className="controls">
        <TimeField time={time} onChange={onChange} />
      </div>
      {error ? (
        <div className="notice" role="alert">
          <p>Couldn't load January: {error.message}</p>
          <button onClick={retry}>Try again</button>
        </div>
      ) : !data?.summary ? (
        <p className="muted">Loading…</p>
      ) : (
        <div aria-busy={loading} className="results">
          <p className="answer">
            In 9 of every 10 hours, actual wind was within ±{gw(data.summary.p90)} of the forecast.
          </p>
          <p className="muted">
            Forecasts available at {time} the day before, delivery days {dayName(data.first_day)} to{' '}
            {dayName(data.last_day)} 2026.
          </p>
          <Tiles s={data.summary} />

          <Breakdown
            title="Average miss by day"
            hint="Click a day to open it."
            groups={data.by_day}
            label={(day) => dayName(day)}
            tick={(day) => String(Number(day.slice(8)))}
            onSelect={(day) => onChange({ view: null, day })}
          />
          <Breakdown
            title="Average miss by hour of day (UK time)"
            groups={data.by_hour}
            label={(hour) => hour}
            tick={(hour) => hour.slice(0, 2)}
          />
          <Breakdown
            title="Average miss by forecast wind level"
            hint="Grouped by what the forecast said, because that's what you know when buying."
            groups={data.by_wind_level_gw}
            label={(level) => WIND_LEVELS[level]}
            tick={(level) => WIND_LEVELS[level]}
          />

          <HowWorkedOut time={time} />
          <p>
            <a className="button" href={`/api/january.csv?decision_time=${time}`} download>
              Download all {data.summary.hours} hours (CSV)
            </a>
          </p>
        </div>
      )}
    </>
  )
}

function Tiles({ s }: { s: Summary }) {
  const tiles = [
    ['Average miss', gw(s.mae), 'either way'],
    ['Direction', signedGw(s.bias), direction(s.bias)],
    ['Hours compared', String(s.hours), '31 delivery days'],
    ['Biggest miss', signedGw(s.biggest.error), dayName(s.biggest.startTime.slice(0, 10))],
  ]
  return (
    <dl className="tiles">
      {tiles.map(([label, value, note]) => (
        <div key={label} className="tile">
          <dt>{label}</dt>
          <dd>
            {value}
            <small>{note}</small>
          </dd>
        </div>
      ))}
    </dl>
  )
}

type Row<K> = { key: K; tick: string; label: string; mae: number; summary: Summary }

function GroupTooltip({ active, payload }: TooltipContentProps) {
  const r = payload?.[0]?.payload as Row<unknown> | undefined
  if (!active || !r) return null
  return (
    <div className="tooltip">
      <strong>{r.label}</strong>
      <div>Average miss {gw(r.summary.mae)}</div>
      <div>
        Direction {signedGw(r.summary.bias)} ({direction(r.summary.bias)})
      </div>
      <div className="muted">{r.summary.hours} hours</div>
    </div>
  )
}

function Breakdown<K extends string | number>(props: {
  title: string
  hint?: string
  groups: Group<K>[]
  label: (k: K) => string
  tick: (k: K) => string
  onSelect?: (k: K) => void
}) {
  const { title, hint, groups, label, tick, onSelect } = props
  const [asTable, setAsTable] = useState(false)
  const rows: Row<K>[] = groups.flatMap((g) =>
    g.summary ? [{ key: g.group, tick: tick(g.group), label: label(g.group), mae: g.summary.mae / 1000, summary: g.summary }] : [],
  )

  return (
    <section>
      <h2>{title}</h2>
      {hint && <p className="muted">{hint}</p>}
      {asTable ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Hours</th>
              <th scope="col">Average miss</th>
              <th scope="col">Direction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.key)}>
                <th scope="row">
                  {onSelect ? (
                    <button className="link inline" onClick={() => onSelect(r.key)}>
                      {r.label}
                    </button>
                  ) : (
                    r.label
                  )}
                </th>
                <td>{r.summary.hours}</td>
                <td>{gw(r.summary.mae)}</td>
                <td className={r.summary.bias > 0 ? 'too-high' : 'too-low'}>
                  {signedGw(r.summary.bias)} <span className="muted">{direction(r.summary.bias)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <BarChart responsive style={{ width: '100%', height: 220 }} data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="tick" tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--border)" interval={0} />
          <YAxis unit=" GW" width={56} tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--border)" />
          <Tooltip content={GroupTooltip} cursor={{ fill: 'var(--surface)' }} />
          <Bar
            dataKey="mae"
            isAnimationActive={false}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={onSelect ? (bar) => onSelect((bar.payload as Row<K>).key) : undefined}
            // colour each bar by direction: orange = forecast mostly too high
            shape={(p) => (
              <Rectangle {...p} fill={(p.payload as Row<K>).summary.bias > 0 ? 'var(--short)' : 'var(--long)'} />
            )}
          />
        </BarChart>
      )}
      <button className="link" onClick={() => setAsTable(!asTable)}>
        {asTable ? 'Show as chart' : 'Show as table'}
      </button>
    </section>
  )
}

function HowWorkedOut({ time }: { time: string }) {
  return (
    <details className="how">
      <summary>How these numbers are worked out</summary>
      <ul>
        <li>
          <strong>Forecast used:</strong> for each delivery hour, the newest Elexon wind forecast (WINDFOR) published at or
          before {time} UK time the day before. January is GMT, so UK time is UTC.
        </li>
        <li>
          <strong>Actual:</strong> Elexon metered wind output (FUELHH) for the half hour starting on that hour.
        </li>
        <li>
          <strong>Miss</strong> = forecast − actual. Positive means the forecast was too high, so buying to it left you
          short.
        </li>
        <li>
          <strong>Average miss</strong> is the average size of the miss, ignoring direction. <strong>Direction</strong> is
          the average with direction kept (bias).
        </li>
        <li>
          <strong>±X GW in 9 of 10 hours</strong> is the 90th percentile of the size of the miss (same method as Excel
          PERCENTILE.INC).
        </li>
        <li>
          <strong>Caveat:</strong> actuals are metered output. When wind farms are told to turn down (curtailment), actual
          output is lower than the wind allowed, so the forecast can look too high.
        </li>
      </ul>
    </details>
  )
}
