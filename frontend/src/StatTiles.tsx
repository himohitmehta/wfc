import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** A small "vs normal" pill. worse = orange, better = teal (same colours as the chart). */
export type Delta = { text: string; tone: 'worse' | 'better' | 'same' }

type Tile = {
  label: string
  value: string
  note?: string
  delta?: Delta
  action?: { label: string; onClick: () => void }
}

const deltaClass = {
  worse: 'bg-short/15 text-short',
  better: 'bg-long/15 text-long',
  same: 'bg-muted text-muted-foreground',
}

function Value({ value, delta }: Pick<Tile, 'value' | 'delta'>) {
  return (
    <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {value}
      {delta && <Badge className={deltaClass[delta.tone]}>{delta.text}</Badge>}
    </dd>
  )
}

/**
 * A row of numbers. `strip` draws them as one joined band that sits on top of a chart
 * (the numbers, then the picture behind them); otherwise each number is its own card.
 */
export function StatTiles({ tiles, strip = false }: { tiles: Tile[]; strip?: boolean }) {
  if (strip)
    return (
      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
        {tiles.map(({ label, value, note, delta }) => (
          <div key={label} className="-mb-px -mr-px border-r border-b px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <div className="text-lg font-semibold tabular-nums">
              <Value value={value} delta={delta} />
            </div>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
          </div>
        ))}
      </dl>
    )

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {tiles.map(({ label, value, note, delta, action }) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>
              <dt>{label}</dt>
            </CardDescription>
            <CardTitle className="text-lg font-semibold tabular-nums group-data-[size=sm]/card:text-lg">
              <Value value={value} delta={delta} />
            </CardTitle>
          </CardHeader>
          {(note || action) && (
            <CardContent className="-mt-2 text-xs text-muted-foreground">
              {note}
              {action && (
                <Button variant="link" size="xs" className="block h-auto px-0 underline" onClick={action.onClick}>
                  {action.label} <ArrowRight className="inline" />
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </dl>
  )
}
