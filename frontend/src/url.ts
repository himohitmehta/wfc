import { useEffect, useState } from 'react'

/** Read and change the page's ?query so views can be shared and Back works. null removes a key. */
export function useUrlParams() {
  const [params, setParams] = useState(() => new URLSearchParams(location.search))

  useEffect(() => {
    const onBack = () => setParams(new URLSearchParams(location.search))
    addEventListener('popstate', onBack)
    return () => removeEventListener('popstate', onBack)
  }, [])

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(location.search)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    history.pushState(null, '', next.size ? `?${next}` : location.pathname)
    setParams(next)
  }

  return [params, update] as const
}
