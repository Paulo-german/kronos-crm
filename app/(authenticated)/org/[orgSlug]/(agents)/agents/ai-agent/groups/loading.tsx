import { Skeleton } from '@/_components/ui/skeleton'

export default function AgentGroupsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Cards de grupos */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/50 bg-card p-5">
            {/* Header do card: switch + nome + badges + dropdown */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-5 w-8 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>

            {/* Grid de workers */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, workerIndex) => (
                <div
                  key={workerIndex}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2"
                >
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: stats */}
            <div className="flex items-center gap-4 border-t pt-3">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        ))}

        {/* Card de criar — placeholder dashed */}
        <Skeleton className="h-[100px] rounded-xl" />
      </div>
    </div>
  )
}
