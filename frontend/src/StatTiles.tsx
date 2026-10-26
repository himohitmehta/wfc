import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** A row of number cards: [label, value, small note?]. Used by both views. */
export function StatTiles({ tiles }: { tiles: [string, string, string?][] }) {
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {tiles.map(([label, value, note]) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>
              <dt>{label}</dt>
            </CardDescription>
            <CardTitle className="text-lg font-semibold tabular-nums group-data-[size=sm]/card:text-lg">
              <dd>{value}</dd>
            </CardTitle>
          </CardHeader>
          {note && <CardContent className="-mt-2 text-xs text-muted-foreground">{note}</CardContent>}
        </Card>
      ))}
    </dl>
  )
}
