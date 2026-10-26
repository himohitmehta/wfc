import { ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, type DayResponse, type HourRow, type Summary } from './api'
import { DayChart } from './DayChart'
import { dayName, daySentence, direction, gw, hourOf, signedGw, ukTime } from './format'
import { DEFAULT_TIME, FIRST_DAY, LAST_DAY, OLD_FORECAST_HOURS, TIMES } from './pilot'
import { StatTiles } from './StatTiles'
import { LoadError, Notice, ResultsSkeleton } from './states'
import { missColour } from './theme'
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

  if (error) return <LoadError what="this day" error={error} retry={retry} retrying={loading} />
  if (!data) return <ResultsSkeleton />

  const missing = data.missing_actuals.length
  return (
    <div aria-busy={loading} className="space-y-4 transition-opacity aria-busy:opacity-60 motion-reduce:transition-none">
      {data.forecast_used.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Forecast used: published {data.forecast_used.map(ukTime).join(' and ')} (UK time)
        </p>
      ) : (
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
          <DayChart hours={data.hours} />
          <NumberTiles s={data.summary} />
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

function NumberTiles({ s }: { s: Summary }) {
  return (
    <StatTiles
      tiles={[
        ['Average forecast', gw(s.avg_forecast)],
        ['Average actual', gw(s.avg_actual)],
        ['Average miss', gw(s.mae), 'either way'],
        ['Direction', signedGw(s.bias), direction(s.bias)],
        ['Biggest miss', signedGw(s.biggest.error), `at ${hourOf(s.biggest.startTime)}`],
      ]}
    />
  )
}

function BiggestMisses({ hours }: { hours: HourRow[] }) {
  const [showAll, setShowAll] = useState(false)
  // top 5 by size of miss, or every hour in time order
  const rows = showAll ? hours : [...hours].sort((a, b) => Math.abs(b.error) - Math.abs(a.error)).slice(0, 5)
  return (
    <section className="pt-4">
      <h2 className="mb-2 text-base font-semibold">{showAll ? `All ${hours.length} hours` : 'Biggest misses'}</h2>
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
              <TableCell className="text-right">
                <span className={missColour(h.error)}>{signedGw(h.error)}</span>{' '}
                <span className="text-muted-foreground">{direction(h.error)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant="link" className="px-0" onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Show biggest misses only' : `Show all ${hours.length} hours`}
      </Button>
    </section>
  )
}
