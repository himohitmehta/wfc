import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApiError } from './api'

/** "Couldn't load" with a retry. `retrying` is true while React Query is asking again. */
export function LoadError({ what, error, retry, retrying }: { what: string; error: ApiError; retry: () => void; retrying: boolean }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Couldn't load {what}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
          {retrying ? 'Trying again…' : 'Try again'}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** A yellow notice for things that are true but worth knowing (old forecast, missing hours). */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert role="status" className="border-warn/50">
      <TriangleAlert className="text-warn" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

/** Grey boxes in the shape of the results, so the page doesn't jump when data arrives. */
export function ResultsSkeleton({ chartHeight = 'h-60 sm:h-80', tiles = 5 }: { chartHeight?: string; tiles?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-11/12" />
      <Skeleton className="mb-5 h-6 w-7/12" />
      <Skeleton className={chartHeight} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {Array.from({ length: tiles }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}
