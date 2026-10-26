import type { ApiError } from './api'

/** "Couldn't load" with a retry. `retrying` is true while React Query is asking again. */
export function LoadError({ what, error, retry, retrying }: { what: string; error: ApiError; retry: () => void; retrying: boolean }) {
  return (
    <div className="notice" role="alert">
      <p>
        Couldn't load {what}. {error.message}
      </p>
      <button onClick={retry} disabled={retrying}>
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  )
}

/** Grey boxes in the shape of the results, so the page doesn't jump when data arrives. */
export function Skeleton({ chartClass = 'chart-box', tiles = 5 }: { chartClass?: string; tiles?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      <div className="bone line" />
      <div className="bone line short" />
      <div className={`bone ${chartClass}`} />
      <div className="tiles">
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} className="bone tile-bone" />
        ))}
      </div>
    </div>
  )
}
