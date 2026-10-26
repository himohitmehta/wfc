// Everything on screen is GW with 1 decimal; the API and CSV stay in MW.

const round = (mw: number) => Math.round(mw / 100) / 10 // MW -> GW, 1 decimal

export const gw = (mw: number) => `${round(mw).toFixed(1)} GW`

/** "+2.1 GW" / "−0.4 GW" / "0.0 GW" */
export const signedGw = (mw: number) => {
  const v = round(mw)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} GW`
}

/** "05:00" from "2026-01-06T05:00:00Z" */
export const hourOf = (iso: string) => iso.slice(11, 16)

const ukDateTime = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
})

/** "Mon 5 Jan, 09:30" in UK time */
export const ukTime = (iso: string) => ukDateTime.format(new Date(iso))

const longDay = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "Tuesday 6 January" from "2026-01-06" */
export const dayName = (day: string) => longDay.format(new Date(`${day}T00:00:00Z`))

/** error = forecast - actual */
export const direction = (errorMw: number) =>
  round(errorMw) > 0 ? 'forecast too high' : round(errorMw) < 0 ? 'forecast too low' : 'about right'

/** The one-sentence answer. Uses bias (direction-aware), not the average miss. */
export function daySentence(avgForecast: number, avgActual: number, bias: number) {
  const said = `The forecast said ${gw(avgForecast)} of wind. It was ${gw(avgActual)}.`
  if (round(bias) > 0) return `${said} Buying to this forecast left you ${gw(bias)} short on average.`
  if (round(bias) < 0) return `${said} Buying to this forecast left you ${gw(-bias)} over-bought on average.`
  return `${said} Buying to this forecast was about right on average.`
}
