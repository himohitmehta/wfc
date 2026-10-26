import { useApi, type JanuaryResponse } from './api'
import { DayView, DEFAULT_TIME, FIRST_DAY } from './DayView'
import { useUrlParams } from './url'

export default function App() {
  const [params, update] = useUrlParams()
  const view = params.get('view') === 'january' ? 'january' : 'day'
  const day = params.get('day') ?? FIRST_DAY
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
      <main>
        {view === 'day' ? <DayView day={day} time={time} onChange={update} /> : <JanuaryView time={time} />}
      </main>
    </>
  )
}

// Placeholder to prove the API wiring; built out in step 7c.
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
