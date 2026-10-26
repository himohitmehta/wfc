// Everything on screen is GW with 1 decimal; the API and CSV stay in MW.

const round = (mw: number) => Math.round(mw / 100) / 10 // MW -> GW, 1 decimal

export const gw = (mw: number) => `${round(mw).toFixed(1)} GW`

// One wording for direction everywhere on screen (error = forecast − actual):
// too high -> you were short, too low -> you bought too much. Signed numbers stay in the CSV only.

/** "2.1 GW too high" / "0.4 GW too low" / "about right" */
export const missText = (errorMw: number) => {
  const v = round(errorMw)
  return v > 0 ? `${gw(errorMw)} too high` : v < 0 ? `${gw(-errorMw)} too low` : 'about right'
}

/** What that miss meant for buying */
export const missMeaning = (errorMw: number) => {
  const v = round(errorMw)
  return v > 0 ? 'you were short' : v < 0 ? 'you bought too much' : 'no adjustment needed'
}

/** "20 min" / "2 h 30 min" */
export const duration = (hours: number) => {
  const mins = Math.round(hours * 60)
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`
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

const shortDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** "2 Jan" from "2026-01-02" */
export const dayShort = (day: string) => shortDay.format(new Date(`${day}T00:00:00Z`))

/** The one-sentence answer. Uses bias (direction-aware), not the average miss. */
export function daySentence(avgForecast: number, avgActual: number, bias: number) {
  const said = `The forecast said ${gw(avgForecast)} of wind. It was ${gw(avgActual)}.`
  if (round(bias) > 0) return `${said} Buying to this forecast left you ${gw(bias)} short on average.`
  if (round(bias) < 0) return `${said} Buying to this forecast, you bought ${gw(-bias)} more than you needed, on average.`
  return `${said} Buying to this forecast was about right on average.`
}

/** January's lean, e.g. "It usually ran high: actual wind came in 1.7 GW below the forecast on average (27 of 31 days)." */
export function leanSentence(bias: number, daysHigh: number, daysLow: number, days: number) {
  if (round(bias) > 0)
    return `It usually ran high: actual wind came in ${gw(bias)} below the forecast on average (${daysHigh} of ${days} days).`
  if (round(bias) < 0)
    return `It usually ran low: actual wind came in ${gw(-bias)} above the forecast on average (${daysLow} of ${days} days).`
  return "It didn't lean either way on average."
}

/** Same rounding as the GW text, so "0.0 GW" counts as neither high nor low. */
export const leansHigh = (errorMw: number) => round(errorMw) > 0
export const leansLow = (errorMw: number) => round(errorMw) < 0
