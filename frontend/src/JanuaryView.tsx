import { ChartColumn, ChevronDown, Download, Table2 } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, type Group, type JanuaryResponse, type Summary } from './api'
import { TimeField } from './DayView'
import { dayName, dayShort, gw, hourOf, leanSentence, leansHigh, leansLow, missMeaning, missText } from './format'
import { StatTiles } from './StatTiles'
import { LoadError, ResultsSkeleton } from './states'
import { axisProps, missColour, toggleLink, tooltipBox } from './theme'
import type { Change } from './url'

const WIND_LEVELS: Record<number, string> = { 0: 'Under 5 GW', 5: '5–10 GW', 10: '10–15 GW', 15: '15 GW and over' }

const daysWith = (groups: Group<string>[], test: (bias: number) => boolean) =>
  groups.filter((g) => g.summary && test(g.summary.bias)).length

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
        <div
          aria-busy={loading}
          className="space-y-4 transition-opacity aria-busy:opacity-60 motion-reduce:transition-none"
        >
          <div>
            <p className="text-lg font-semibold sm:text-xl">
              In 9 of every 10 hours, actual wind was within ±{gw(data.summary.p90)} of the forecast.
            </p>
            <p className="font-medium">
              {leanSentence(
                data.summary.bias,
                daysWith(data.by_day, leansHigh),
                daysWith(data.by_day, leansLow),
                data.by_day.length,
              )}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Newest forecast by {time} the day before · {dayShort(data.first_day)} – {dayShort(data.last_day)} 2026
          </p>
          <Tiles data={data} onOpenDay={(day) => onChange({ view: null, day })} />

          <PlanByWindLevel groups={data.by_wind_level_gw} />
          <Breakdown
            title="Average miss by day"
            hint="Click a bar to see that day hour by hour."
            groups={data.by_day}
            label={(day) => dayName(day)}
            tick={(day) => String(Number(day.slice(8)))}
            onSelect={(day) => onChange({ view: null, day })}
            average={data.summary.mae}
          />
          <Breakdown
            title="Average miss by hour of day (UK time)"
            groups={data.by_hour}
            label={(hour) => hour}
            tick={(hour) => hour.slice(0, 2)}
            average={data.summary.mae}
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

function Tiles({ data, onOpenDay }: { data: JanuaryResponse; onOpenDay: (day: string) => void }) {
  const s = data.summary!
  const low = leansLow(s.bias)
  const biggestDay = s.biggest.startTime.slice(0, 10)
  return (
    <StatTiles
      tiles={[
        { label: 'Average miss', value: gw(s.mae), note: 'too high or too low' },
        { label: 'Which way it missed', value: missText(s.bias), note: missMeaning(s.bias) },
        {
          label: low ? 'Days it ran low' : 'Days it ran high',
          value: `${daysWith(data.by_day, low ? leansLow : leansHigh)} of ${data.by_day.length}`,
          note: `${s.hours} hours compared`,
        },
        {
          label: 'Biggest miss',
          value: missText(s.biggest.error),
          note: `${dayName(biggestDay)}, ${hourOf(s.biggest.startTime)}`,
          action: { label: 'Open this day', onClick: () => onOpenDay(biggestDay) },
        },
      ]}
    />
  )
}

/** The planning table: find tomorrow's forecast level, read the band to plan for and which way it usually missed. */
function PlanByWindLevel({ groups }: { groups: Group<number>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How far off, by what the forecast said</CardTitle>
        <CardDescription>
          Find tomorrow's forecast in the first column. In 9 of every 10 hours, actual wind was within the band shown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Forecast says</TableHead>
              <TableHead className="text-right">Plan for</TableHead>
              <TableHead className="text-right">Usually ran</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Average miss</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(
              ({ group, summary: s }) =>
                s && (
                  <TableRow key={group}>
                    <TableHead scope="row" className="font-medium text-foreground">
                      {WIND_LEVELS[group]}
                    </TableHead>
                    <TableCell className="text-right font-semibold">±{gw(s.p90)}</TableCell>
                    <TableCell className={`text-right whitespace-normal ${missColour(s.bias)}`}>
                      {missText(s.bias)}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">{gw(s.mae)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{s.hours}</TableCell>
                  </TableRow>
                ),
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

type Row<K> = { key: K; tick: string; label: string; mae: number; summary: Summary }

function GroupTooltip({ active, payload, clickable }: TooltipContentProps & { clickable: boolean }) {
  const r = payload?.[0]?.payload as Row<unknown> | undefined
  if (!active || !r) return null
  return (
    <div className={tooltipBox}>
      <strong>{r.label}</strong>
      <div>Average miss {gw(r.summary.mae)}</div>
      <div>Usually ran {missText(r.summary.bias)}</div>
      <div className="text-muted-foreground">{r.summary.hours} hours</div>
      {clickable && <div className="mt-1 text-muted-foreground">Click to see this day hour by hour</div>}
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
  average?: number // MW; drawn as a dashed "Jan avg" line so unusual bars stand out
}) {
  const { title, hint, groups, label, tick, onSelect, average } = props
  const [asTable, setAsTable] = useState(false)
  const rows: Row<K>[] = groups.flatMap((g) =>
    g.summary
      ? [{ key: g.group, tick: tick(g.group), label: label(g.group), mae: g.summary.mae / 1000, summary: g.summary }]
      : [],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {(hint || average !== undefined) && (
          <CardDescription>
            {hint}
            {average !== undefined && ` Dashed line: January average, ${gw(average)}.`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {asTable ? (
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Hours</TableHead>
                <TableHead className="text-right">Average miss</TableHead>
                <TableHead className="text-right">Usually ran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.key)}>
                  <TableHead scope="row" className="font-medium text-foreground">
                    {onSelect ? (
                      <Button variant="link" className={`h-auto ${toggleLink}`} onClick={() => onSelect(r.key)}>
                        {r.label}
                      </Button>
                    ) : (
                      r.label
                    )}
                  </TableHead>
                  <TableCell className="hidden text-right sm:table-cell">{r.summary.hours}</TableCell>
                  <TableCell className="text-right">{gw(r.summary.mae)}</TableCell>
                  <TableCell className={`text-right whitespace-normal ${missColour(r.summary.bias)}`}>
                    {missText(r.summary.bias)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-44 sm:h-56">
            <BarChart
              responsive
              style={{ width: '100%', height: '100%' }}
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="tick" {...axisProps} interval="preserveStartEnd" />
              <YAxis unit=" GW" width={56} {...axisProps} />
              <Tooltip
                content={(p) => <GroupTooltip {...p} clickable={!!onSelect} />}
                cursor={{ fill: 'var(--muted)' }}
              />
              {average !== undefined && (
                <ReferenceLine
                  y={average / 1000}
                  stroke="var(--foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
              )}
              <Bar
                dataKey="mae"
                isAnimationActive={false}
                cursor={onSelect ? 'pointer' : undefined}
                onClick={onSelect ? (bar) => onSelect((bar.payload as Row<K>).key) : undefined}
                // colour each bar by direction, rounded like the text: orange = too high, teal = too low, grey = about right
                shape={(p) => {
                  const bias = (p.payload as Row<K>).summary.bias
                  const fill = leansHigh(bias)
                    ? 'var(--short)'
                    : leansLow(bias)
                      ? 'var(--long)'
                      : 'var(--muted-foreground)'
                  return <Rectangle {...p} fill={fill} />
                }}
              />
            </BarChart>
          </div>
        )}
        <Button variant="link" className={toggleLink} onClick={() => setAsTable(!asTable)}>
          {asTable ? <ChartColumn /> : <Table2 />}
          {asTable ? 'Show as chart' : 'Show as table'}
        </Button>
      </CardContent>
    </Card>
  )
}

function HowWorkedOut({ time }: { time: string }) {
  return (
    <Collapsible className="rounded-xl bg-card px-4 py-2 ring-1 ring-foreground/10">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group -mx-2 w-full justify-between px-2">
          How these numbers are worked out
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="list-disc space-y-2 py-2 pl-5 text-sm">
          <li>
            <strong>Forecast used:</strong> for each delivery hour, the newest Elexon wind forecast (WINDFOR) published
            at or before {time} UK time the day before. January is GMT, so UK time is UTC.
          </li>
          <li>
            <strong>Actual:</strong> Elexon metered wind output (FUELHH) for the half hour starting on that hour.
          </li>
          <li>
            <strong>Miss</strong> = forecast − actual. Positive means the forecast was too high, so buying to it left
            you short.
          </li>
          <li>
            <strong>Average miss</strong> is the average size of the miss, too high or too low.{' '}
            <strong>Which way it missed</strong> is the average with direction kept (bias): "too high" means actual wind
            came in below the forecast.
          </li>
          <li>
            <strong>±X GW in 9 of 10 hours</strong> (and "Plan for") is the 90th percentile of the size of the miss
            (same method as Excel PERCENTILE.INC), over every compared hour of the pilot.
          </li>
          <li>
            <strong>Caveat:</strong> actuals are metered output. When wind farms are told to turn down (curtailment),
            actual output is lower than the wind allowed, so the forecast can look too high.
          </li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
