import { useApi, type DayResponse, type JanuaryResponse } from './api'
import { useUrlParams } from './url'

export const DEFAULT_DAY = '2026-01-02'
export const DEFAULT_TIME = '09:50'

export default function App() {
  const [params, update] = useUrlParams()
  const view = params.get('view') === 'january' ? 'january' : 'day'
  const day = params.get('day') ?? DEFAULT_DAY
  const time = params.get('time') ?? DEFAULT_TIME

  return (
    <>
      <header className="top">
        <h1>Wind forecast check</h1>
        <p className="muted">Day-ahead wind forecasts vs actual GB wind output, January 2026</p>
        <nav className="tabs" aria-label="Views">
          <button aria-current={view === 'day' ? 'page' : undefined} onClick={() => update({ view: null })}>
            Day view
          </button>
          <button aria-current={view === 'january' ? 'page' : undefined} onClick={() => update({ view: 'january' })}>
            January accuracy
          </button>
        </nav>
      </header>
      <main>{view === 'day' ? <DayView day={day} time={time} /> : <JanuaryView time={time} />}</main>
    </>
  )
}

// Placeholders to prove the API wiring; built out in steps 7b and 7c.
function DayView({ day, time }: { day: string; time: string }) {
  const { data, error, loading } = useApi<DayResponse>(`/api/day?day=${day}&decision_time=${time}`)
  if (error) return <p>Couldn't load: {error.message}</p>
  if (!data) return <p>Loading…</p>
  return (
    <p aria-busy={loading}>
      {data.day}: forecast used published {data.forecast_used.join(', ')}, average miss{' '}
      {data.summary ? Math.round(data.summary.mae) : '–'} MW
    </p>
  )
}

function JanuaryView({ time }: { time: string }) {
  const { data, error, loading } = useApi<JanuaryResponse>(`/api/january?decision_time=${time}`)
  if (error) return <p>Couldn't load: {error.message}</p>
  if (!data) return <p>Loading…</p>
  return (
    <p aria-busy={loading}>
      {data.summary?.hours} hours compared, average miss {data.summary ? Math.round(data.summary.mae) : '–'} MW
    </p>
  )
}
