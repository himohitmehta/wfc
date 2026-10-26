import { useEffect, useState } from 'react'

// Shapes returned by backend/src/backend/api.py. All values are MW.
export type HourRow = {
  startTime: string
  publishTime: string
  forecast: number
  actual: number
  error: number // forecast - actual; positive = forecast too high
}

export type Summary = {
  hours: number
  avg_forecast: number
  avg_actual: number
  mae: number
  bias: number
  rmse: number
  p90: number
  max_abs: number
  biggest: HourRow
}

export type DayResponse = {
  day: string
  decision_time: string
  deadline: string
  forecast_used: string[]
  forecast_age_hours: number | null
  hours: HourRow[]
  missing_actuals: string[]
  summary: Summary | null
}

export type Group<K> = { group: K; summary: Summary | null }

export type JanuaryResponse = {
  decision_time: string
  first_day: string
  last_day: string
  summary: Summary | null
  by_day: Group<string>[]
  by_hour: Group<string>[]
  by_wind_level_gw: Group<number>[]
}

export class ApiError extends Error {
  status: number // 0 = network error, no response
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { signal })
  } catch (e) {
    if (signal.aborted) throw e
    throw new ApiError(0, 'Could not reach the server.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    // FastAPI sends our own errors as a string, type-check errors as a list
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed (${res.status}).`
    throw new ApiError(res.status, detail)
  }
  return body as T
}

/** Fetch `path` whenever it changes. Keeps the previous data while the next one loads. */
export function useApi<T>(path: string) {
  const [attempt, setAttempt] = useState(0)
  const key = `${path}#${attempt}` // changes on a new path or a "Try again"
  const [result, setResult] = useState<{ key: string; data?: T; error?: ApiError }>()

  useEffect(() => {
    const controller = new AbortController()
    getJson<T>(path, controller.signal).then(
      (data) => setResult({ key, data }),
      (error) => {
        if (!controller.signal.aborted) setResult((r) => ({ key, data: r?.data, error }))
      },
    )
    return () => controller.abort() // drop answers for a path we've moved away from
  }, [path, key])

  const loading = result?.key !== key // the last answer is for an older request
  return {
    data: result?.data,
    error: loading ? undefined : result?.error,
    loading,
    retry: () => setAttempt((a) => a + 1),
  }
}
