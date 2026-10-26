import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DayView } from './DayView'
import { JanuaryView } from './JanuaryView'
import { useUrlState } from './url'

export default function App() {
  const [{ view, day, time }, setUrl] = useUrlState()

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="pt-6 pb-2">
        <h1 className="text-xl font-semibold sm:text-2xl">Wind forecast check</h1>
        <p className="text-muted-foreground">Day-ahead wind forecasts vs actual GB wind output, January 2026</p>
      </header>
      {/* The URL is the source of truth, so Back/forward and shared links pick the tab */}
      <Tabs value={view} onValueChange={(v) => setUrl({ view: v as typeof view })}>
        <TabsList variant="line" className="mb-4 w-full justify-start border-b">
          <TabsTrigger value="day" className="flex-none px-3">
            Day view
          </TabsTrigger>
          <TabsTrigger value="january" className="flex-none px-3">
            January accuracy
          </TabsTrigger>
        </TabsList>
        <TabsContent value="day">
          <DayView day={day} time={time} onChange={setUrl} />
        </TabsContent>
        <TabsContent value="january">
          <JanuaryView time={time} onChange={setUrl} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
