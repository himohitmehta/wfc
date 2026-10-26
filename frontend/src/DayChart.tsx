import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { HourRow } from './api'
import { direction, gw, hourOf, signedGw } from './format'
import { axisProps, tooltipBox } from './theme'

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
    <div className={tooltipBox}>
      <strong>{p.hour}</strong>
      <div>Forecast {gw(p.forecast * 1000)}</div>
      <div>Actual {gw(p.actual * 1000)}</div>
      <div>
        Miss {signedGw(p.error)} ({direction(p.error)})
      </div>
    </div>
  )
}

/** Legend swatch: a line (solid/dashed) or a filled block in one of the theme colours. */
function Key({ colour, kind, children }: { colour: string; kind: 'line' | 'dashed' | 'fill'; children: string }) {
  const swatch =
    kind === 'fill'
      ? { background: `color-mix(in oklch, var(${colour}) 35%, transparent)`, height: 10 }
      : { borderTop: `2px ${kind === 'dashed' ? 'dashed' : 'solid'} var(${colour})` }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-[18px]" style={swatch} aria-hidden="true" />
      {children}
    </span>
  )
}

export function DayChart({ hours }: { hours: HourRow[] }) {
  return (
    <figure>
      <div className="h-60 sm:h-80">
        <ComposedChart
          responsive
          style={{ width: '100%', height: '100%' }}
          data={hours.map(toPoint)}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          desc="Hourly wind forecast compared with actual output. Use left and right arrow keys to move between hours."
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="hour" interval={2} {...axisProps} />
          <YAxis unit=" GW" width={56} tickFormatter={(v: number) => v.toFixed(0)} {...axisProps} />
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
          <Tooltip content={HourTooltip} cursor={{ stroke: 'var(--muted-foreground)' }} />
        </ComposedChart>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Key colour="--actual" kind="line">
          Actual
        </Key>
        <Key colour="--forecast" kind="dashed">
          Forecast
        </Key>
        <Key colour="--short" kind="fill">
          Forecast too high (you were short)
        </Key>
        <Key colour="--long" kind="fill">
          Forecast too low
        </Key>
      </figcaption>
    </figure>
  )
}
