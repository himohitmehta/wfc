import { DayView } from './DayView'
import { JanuaryView } from './JanuaryView'
import { useUrlState } from './url'

export default function App() {
  const [{ view, day, time }, setUrl] = useUrlState()

  return (
    <>
      <header className="top">
        <h1>Wind forecast check</h1>
        <p className="muted">Day-ahead wind forecasts vs actual GB wind output, January 2026</p>
        <nav className="tabs" aria-label="Views">
          <button aria-current={view === 'day' ? 'page' : undefined} onClick={() => setUrl({ view: 'day' })}>
            Day view
          </button>
          <button aria-current={view === 'january' ? 'page' : undefined} onClick={() => setUrl({ view: 'january' })}>
            January accuracy
          </button>
        </nav>
      </header>
      <main>
        {view === 'day' ? <DayView day={day} time={time} onChange={setUrl} /> : <JanuaryView time={time} onChange={setUrl} />}
      </main>
    </>
  )
}
