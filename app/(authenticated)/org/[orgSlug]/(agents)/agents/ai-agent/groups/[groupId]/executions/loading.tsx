import { Skeleton } from '@/_components/ui/skeleton'

export default function AgentGroupExecutionsLoading() {
  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-40 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Card de analytics */}
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="border-b p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <div className="flex gap-4">
                <div className="space-y-1 text-right">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
