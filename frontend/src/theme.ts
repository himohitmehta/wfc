// Class names and Recharts props shared by both views, so charts and tables match the shadcn theme.

export const axisProps = { tick: { fill: 'var(--muted-foreground)', fontSize: 12 }, stroke: 'var(--border)' }

export const tooltipBox = 'rounded-lg bg-popover px-2.5 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10'

/** Orange when the forecast was too high (you were short), teal when too low. Rounds like the GW text, so "0.0 GW" stays neutral. */
export const missColour = (errorMw: number) => {
  const tenthsGw = Math.round(errorMw / 100)
  return tenthsGw > 0 ? 'text-short' : tenthsGw < 0 ? 'text-long' : ''
}
