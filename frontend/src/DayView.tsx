import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Clock } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, type DayResponse, type HourRow, type JanuaryResponse, type Summary } from './api'
import {
  dayName,
  daySentence,
  duration,
  gw,
  hourOf,
  leansHigh,
  leansLow,
  missMeaning,
  missText,
  ukTime,
} from './format'
import { DEFAULT_TIME, FIRST_DAY, LAST_DAY, OLD_FORECAST_HOURS, TIMES } from './pilot'
import { StatTiles, type Delta } from './StatTiles'
import { LoadError, Notice, ResultsSkeleton } from './states'
import { missColour, toggleLink } from './theme'
import type { Change } from './url'

// Recharts is the biggest dependency; load it after the numbers are on screen
const DayChart = lazy(() => import('./DayChart').then((m) => ({ default: m.DayChart })))

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
    <Alert>
      <CircleAlert />
      <AlertTitle>
        {dayName(day)} {day.slice(0, 4)} is outside the pilot
      </AlertTitle>
      <AlertDescription>
        <p>
          Delivery days run from {dayName(FIRST_DAY)} to {dayName(LAST_DAY)} 2026.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onChange({ day: FIRST_DAY })}>
            Go to {dayName(FIRST_DAY)}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onChange({ day: LAST_DAY })}>
            Go to {dayName(LAST_DAY)}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

function DayResults({ day, time }: { day: string; time: string }) {
  const { data, error, loading, retry } = useApi<DayResponse>(`/api/day?day=${day}&decision_time=${time}`)
  // January's average gives the day's numbers a reference point; it's cached for the January tab too
  const january = useApi<JanuaryResponse>(`/api/january?decision_time=${time}`).data?.summary

  if (error) return <LoadError what="this day" error={error} retry={retry} retrying={loading} />
  if (!data) return <ResultsSkeleton />

  const missing = data.missing_actuals.length
  return (
    <div
      aria-busy={loading}
      className="space-y-4 transition-opacity aria-busy:opacity-60 motion-reduce:transition-none"
    >
      <div>
        <h2 className="text-lg font-semibold">{dayName(data.day)}</h2>
        <p className="text-sm text-muted-foreground">
          Decided at {time} on {dayName(data.deadline.slice(0, 10))}
        </p>
      </div>
      {data.forecast_used.length === 0 && (
        <Notice title="No forecast">
          No wind forecast had been published by {time} the day before {dayName(data.day)}.
        </Notice>
      )}
      {data.forecast_age_hours !== null && data.forecast_age_hours > OLD_FORECAST_HOURS && (
        <Notice title="Old forecast">
          It was published {Math.round(data.forecast_age_hours)} hours before your {time} decision time. A newer run was
          probably missing, so the miss may look bigger than usual.
        </Notice>
      )}
      {missing > 0 && data.summary && (
        <Notice title="Some actuals are missing">
          Actual output is missing for {missing} of {missing + data.hours.length} hours (
          {data.missing_actuals.map(hourOf).join(', ')}). The numbers below use the other {data.hours.length} hours.
        </Notice>
      )}
      {data.summary ? (
        <>
          <p className="text-lg font-semibold sm:text-xl">
            {daySentence(data.summary.avg_forecast, data.summary.avg_actual, data.summary.bias)}
          </p>
          {/* One panel: when the forecast was published, the numbers, then the picture behind them */}
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Forecast vs actual, hour by hour</CardTitle>
              <Badge variant="outline" className="h-auto py-1 whitespace-normal">
                <Clock />
                Forecast published {data.forecast_used.map(ukTime).join(' and ')}
                {data.forecast_age_hours !== null &&
                  ` · ${duration(data.forecast_age_hours)} before your ${time} deadline`}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <NumberTiles s={data.summary} january={january} />
              <Suspense fallback={<Skeleton className="h-60 sm:h-80" />}>
                <DayChart hours={data.hours} />
              </Suspense>
            </CardContent>
          </Card>
          <BiggestMisses hours={data.hours} />
        </>
      ) : (
        data.forecast_used.length > 0 && (
          <Notice title="No actuals yet">
            Actual wind output isn't available yet for {dayName(data.day)}, so there's nothing to compare.
          </Notice>
        )
      )}
    </div>
  )
}

const fieldLabel = 'mb-1 block text-sm text-muted-foreground'

function DayControls({ day, time, onChange }: { day: string; time: string; onChange: (c: Change) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-x-8 gap-y-4">
      <div>
        <label htmlFor="day" className={fieldLabel}>
          Delivery day
        </label>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous day"
            disabled={day <= FIRST_DAY}
            onClick={() => onChange({ day: day > LAST_DAY ? LAST_DAY : addDays(day, -1) })}
          >
            <ChevronLeft />
          </Button>
          {/* The browser's own date box, kept on purpose: phones get their native picker */}
          <Input
            id="day"
            type="date"
            className="w-auto"
            min={FIRST_DAY}
            max={LAST_DAY}
            value={day}
            onChange={(e) => e.target.value && onChange({ day: e.target.value })}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            disabled={day >= LAST_DAY}
            onClick={() => onChange({ day: day < FIRST_DAY ? FIRST_DAY : addDays(day, 1) })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <TimeField time={time} onChange={onChange} />
    </div>
  )
}

/** Decision-time dropdown, shared by both views through the ?time= URL value. */
export function TimeField({ time, onChange }: { time: string; onChange: (c: Change) => void }) {
  return (
    <div>
      <label htmlFor="time" className={fieldLabel}>
        Decision time (day before)
      </label>
      <div className="flex items-center gap-1.5">
        <NativeSelect id="time" value={time} onChange={(e) => onChange({ time: e.target.value })}>
          {TIMES.map((t) => (
            <NativeSelectOption key={t} value={t}>
              {t}
              {t === DEFAULT_TIME ? ' (auction close)' : ''}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {time !== DEFAULT_TIME && (
          <Button variant="ghost" onClick={() => onChange({ time: null })}>
            Reset to 09:50
          </Button>
        )}
      </div>
    </div>
  )
}

/** "▲ 0.2 GW vs Jan" – a bigger miss than usual is worse (orange), smaller is better (teal). */
function vsJanuary(dayMae: number, januaryMae: number): Delta {
  const diff = dayMae - januaryMae
  if (leansHigh(diff)) return { text: `▲ ${gw(diff)} vs Jan`, tone: 'worse' }
  if (leansLow(diff)) return { text: `▼ ${gw(-diff)} vs Jan`, tone: 'better' }
  return { text: 'same as Jan', tone: 'same' }
}

function NumberTiles({ s, january }: { s: Summary; january?: Summary | null }) {
  return (
    <StatTiles
      strip
      tiles={[
        { label: 'Average forecast', value: gw(s.avg_forecast) },
        { label: 'Average actual', value: gw(s.avg_actual) },
        {
          label: 'Average miss',
          value: gw(s.mae),
          delta: january ? vsJanuary(s.mae, january.mae) : undefined,
          note: january ? `January average ${gw(january.mae)}` : 'too high or too low',
        },
        { label: 'Which way it missed', value: missText(s.bias), note: missMeaning(s.bias) },
        { label: 'Biggest miss', value: missText(s.biggest.error), note: `at ${hourOf(s.biggest.startTime)}` },
      ]}
    />
  )
}

function BiggestMisses({ hours }: { hours: HourRow[] }) {
  const [showAll, setShowAll] = useState(false)
  // top 5 by size of miss, or every hour in time order
  const rows = showAll ? hours : [...hours].sort((a, b) => Math.abs(b.error) - Math.abs(a.error)).slice(0, 5)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{showAll ? `All ${hours.length} hours` : 'Biggest misses'}</CardTitle>
        <CardDescription>
          {showAll ? 'In time order.' : 'The 5 hours where the forecast was furthest off.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Hour</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Miss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((h) => (
              <TableRow key={h.startTime}>
                <TableHead scope="row" className="font-medium text-foreground">
                  {hourOf(h.startTime)}
                </TableHead>
                <TableCell className="text-right">{gw(h.forecast)}</TableCell>
                <TableCell className="text-right">{gw(h.actual)}</TableCell>
                <TableCell className={`text-right ${missColour(h.error)}`}>{missText(h.error)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="link" className={toggleLink} onClick={() => setShowAll(!showAll)}>
          {showAll ? <ChevronUp /> : <ChevronDown />}
          {showAll ? 'Show biggest misses only' : `Show all ${hours.length} hours`}
        </Button>
      </CardContent>
    </Card>
  )
}
