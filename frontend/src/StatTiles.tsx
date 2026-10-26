import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Tile = { label: string; value: string; note?: string; action?: { label: string; onClick: () => void } }

/** A row of number cards. Used by both views. */
export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {tiles.map(({ label, value, note, action }) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>
              <dt>{label}</dt>
            </CardDescription>
            <CardTitle className="text-lg font-semibold tabular-nums group-data-[size=sm]/card:text-lg">
              <dd>{value}</dd>
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
