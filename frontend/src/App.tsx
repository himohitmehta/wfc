import { DayView, DEFAULT_TIME, FIRST_DAY } from './DayView'
import { JanuaryView } from './JanuaryView'
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
        {view === 'day' ? <DayView day={day} time={time} onChange={update} /> : <JanuaryView time={time} onChange={update} />}
      </main>
    </>
  )
}
