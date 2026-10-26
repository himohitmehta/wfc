import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { HourRow } from './api'
import { direction, gw, hourOf, signedGw } from './format'

type Point = {
  hour: string
  forecast: number
  actual: number
  error: number
  // [low, high] bands in GW; zero-width when the gap is the other way
  tooHigh: [number, number]
  tooLow: [number, number]
}

function toPoint(h: HourRow): Point {
  const f = h.forecast / 1000
  const a = h.actual / 1000
  return {
    hour: hourOf(h.startTime),
    forecast: f,
    actual: a,
    error: h.error,
    tooHigh: [a, Math.max(f, a)],
    tooLow: [Math.min(f, a), a],
  }
}

function HourTooltip({ active, payload }: TooltipContentProps) {
  const p = payload?.[0]?.payload as Point | undefined
  if (!active || !p) return null
  return (
    <div className="tooltip">
      <strong>{p.hour}</strong>
      <div>Forecast {gw(p.forecast * 1000)}</div>
      <div>Actual {gw(p.actual * 1000)}</div>
      <div>
        Miss {signedGw(p.error)} ({direction(p.error)})
      </div>
    </div>
  )
}

export function DayChart({ hours }: { hours: HourRow[] }) {
  return (
    <figure className="chart">
      <ComposedChart
        responsive
        style={{ width: '100%', height: 320 }}
        data={hours.map(toPoint)}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        desc="Hourly wind forecast compared with actual output. Use left and right arrow keys to move between hours."
      >
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="hour" interval={2} tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--border)" />
        <YAxis
          unit=" GW"
          width={56}
          tickFormatter={(v: number) => v.toFixed(0)}
          tick={{ fill: 'var(--muted)', fontSize: 12 }}
          stroke="var(--border)"
        />
        <Area dataKey="tooHigh" fill="var(--short)" fillOpacity={0.25} stroke="none" isAnimationActive={false} />
        <Area dataKey="tooLow" fill="var(--long)" fillOpacity={0.25} stroke="none" isAnimationActive={false} />
        <Line dataKey="actual" name="Actual" stroke="var(--actual)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line
          dataKey="forecast"
          name="Forecast"
          stroke="var(--forecast)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip content={HourTooltip} cursor={{ stroke: 'var(--muted)' }} />
      </ComposedChart>
      <figcaption className="legend">
        <span className="key actual">Actual</span>
        <span className="key forecast">Forecast</span>
        <span className="key too-high">Forecast too high (you were short)</span>
        <span className="key too-low">Forecast too low</span>
      </figcaption>
    </figure>
  )
}
