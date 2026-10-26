// Same pilot window as backend/src/backend/api.py
export const FIRST_DAY = '2026-01-02'
export const LAST_DAY = '2026-02-01'
export const DEFAULT_TIME = '09:50' // N2EX day-ahead auction close

// Every half hour from 06:00 to 11:00, plus the 09:50 auction close
export const TIMES = [
  ...Array.from({ length: 11 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`),
  DEFAULT_TIME,
].sort()
