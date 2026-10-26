import { createParser, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { DEFAULT_TIME, FIRST_DAY, TIMES } from './pilot'

// Any real YYYY-MM-DD is kept, even outside the pilot, so the page can say "outside the pilot" instead of silently jumping.
const parseAsDay = createParser({
  parse: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null),
  serialize: (v: string) => v,
})

const urlKeys = {
  view: parseAsStringLiteral(['day', 'january'] as const).withDefault('day'),
  day: parseAsDay.withDefault(FIRST_DAY),
  time: parseAsStringLiteral(TIMES).withDefault(DEFAULT_TIME), // unknown times fall back to 09:50
}

/** ?view=…&day=…&time=… as typed state. Default values are left out of the URL; push keeps Back working. */
export function useUrlState() {
  return useQueryStates(urlKeys, { history: 'push' })
}

/** What views pass up to change the URL; null resets a key to its default. */
export type Change = Parameters<ReturnType<typeof useUrlState>[1]>[0]
