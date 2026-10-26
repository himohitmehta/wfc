import { ChevronDown, Download } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Rectangle, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, type Group, type JanuaryResponse, type Summary } from './api'
import { TimeField } from './DayView'
import { dayName, direction, gw, signedGw } from './format'
import { StatTiles } from './StatTiles'
import { LoadError, ResultsSkeleton } from './states'
import { axisProps, missColour, tooltipBox } from './theme'
import type { Change } from './url'

const WIND_LEVELS: Record<number, string> = { 0: 'Under 5 GW', 5: '5–10 GW', 10: '10–15 GW', 15: '15 GW and over' }

export function JanuaryView({ time, onChange }: { time: string; onChange: (c: Change) => void }) {
  const { data, error, loading, retry } = useApi<JanuaryResponse>(`/api/january?decision_time=${time}`)

  return (
    <>
      <div className="mb-4">
        <TimeField time={time} onChange={onChange} />
      </div>
      {error ? (
        <LoadError what="January" error={error} retry={retry} retrying={loading} />
      ) : !data?.summary ? (
        <ResultsSkeleton chartHeight="h-44 sm:h-56" tiles={4} />
      ) : (
        <div aria-busy={loading} className="space-y-4 transition-opacity aria-busy:opacity-60 motion-reduce:transition-none">
          <p className="text-lg font-semibold sm:text-xl">
            In 9 of every 10 hours, actual wind was within ±{gw(data.summary.p90)} of the forecast.
          </p>
          <p className="text-sm text-muted-foreground">
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
          <Button variant="outline" asChild>
            <a href={`/api/january.csv?decision_time=${time}`} download>
              <Download />
              Download all {data.summary.hours} hours (CSV)
            </a>
          </Button>
        </div>
      )}
    </>
  )
}

function Tiles({ s }: { s: Summary }) {
  return (
    <StatTiles
      tiles={[
        ['Average miss', gw(s.mae), 'either way'],
        ['Direction', signedGw(s.bias), direction(s.bias)],
        ['Hours compared', String(s.hours), '31 delivery days'],
        ['Biggest miss', signedGw(s.biggest.error), dayName(s.biggest.startTime.slice(0, 10))],
      ]}
    />
  )
}

type Row<K> = { key: K; tick: string; label: string; mae: number; summary: Summary }

function GroupTooltip({ active, payload }: TooltipContentProps) {
  const r = payload?.[0]?.payload as Row<unknown> | undefined
  if (!active || !r) return null
  return (
    <div className={tooltipBox}>
      <strong>{r.label}</strong>
      <div>Average miss {gw(r.summary.mae)}</div>
      <div>
        Direction {signedGw(r.summary.bias)} ({direction(r.summary.bias)})
      </div>
      <div className="text-muted-foreground">{r.summary.hours} hours</div>
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
    <section className="pt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mb-2 text-sm text-muted-foreground">{hint}</p>}
      {asTable ? (
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Average miss</TableHead>
              <TableHead className="text-right">Direction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={String(r.key)}>
                <TableHead scope="row" className="font-medium text-foreground">
                  {onSelect ? (
                    <Button variant="link" className="h-auto px-0" onClick={() => onSelect(r.key)}>
                      {r.label}
                    </Button>
                  ) : (
                    r.label
                  )}
                </TableHead>
                <TableCell className="text-right">{r.summary.hours}</TableCell>
                <TableCell className="text-right">{gw(r.summary.mae)}</TableCell>
                <TableCell className="text-right">
                  <span className={missColour(r.summary.bias)}>{signedGw(r.summary.bias)}</span>{' '}
                  <span className="text-muted-foreground">{direction(r.summary.bias)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="h-44 sm:h-56">
        <BarChart responsive style={{ width: '100%', height: '100%' }} data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="tick" {...axisProps} interval="preserveStartEnd" />
          <YAxis unit=" GW" width={56} {...axisProps} />
          <Tooltip content={GroupTooltip} cursor={{ fill: 'var(--muted)' }} />
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
        </div>
      )}
      <Button variant="link" className="px-0" onClick={() => setAsTable(!asTable)}>
        {asTable ? 'Show as chart' : 'Show as table'}
      </Button>
    </section>
  )
}

function HowWorkedOut({ time }: { time: string }) {
  return (
    <Collapsible className="mt-8 rounded-xl bg-card px-4 py-2 ring-1 ring-foreground/10">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group -mx-2 w-full justify-between px-2">
          How these numbers are worked out
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
      <ul className="list-disc space-y-2 py-2 pl-5 text-sm">
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
      </CollapsibleContent>
    </Collapsible>
  )
}
