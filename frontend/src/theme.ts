import { leansHigh, leansLow } from './format'

// Class names and Recharts props shared by both views, so charts and tables match the shadcn theme.

export const axisProps = { tick: { fill: 'var(--muted-foreground)', fontSize: 12 }, stroke: 'var(--border)' }

export const tooltipBox = 'rounded-lg bg-popover px-2.5 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10'

/** Orange when the forecast was too high (you were short), teal when too low, plain when it rounds to 0.0 GW. */
export const missColour = (errorMw: number) => (leansHigh(errorMw) ? 'text-short' : leansLow(errorMw) ? 'text-long' : '')

/** Toggle links ("Show as table") need to look clickable: underline always, not only on hover. */
export const toggleLink = 'px-0 underline underline-offset-4'
