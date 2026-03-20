import { Skeleton } from '@/_components/ui/skeleton'

const AgentDetailLoading = () => {
  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Back button + Title */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-20" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid h-12 w-full grid-cols-4 gap-1 rounded-md border border-border/50 bg-tab/30 p-1">
          <Skeleton className="h-full rounded-md" />
          <Skeleton className="h-full rounded-md" />
          <Skeleton className="h-full rounded-md" />
          <Skeleton className="h-full rounded-md" />
        </div>

        {/* General tab content sections */}
        <div className="space-y-6">
          {/* Identity section */}
          <div className="rounded-xl border border-border/50 bg-secondary/20">
            <div className="space-y-1.5 p-6 pb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="space-y-4 p-6 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Company section */}
          <div className="rounded-xl border border-border/50 bg-secondary/20">
            <div className="space-y-1.5 p-6 pb-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-4 p-6 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Communication section */}
          <div className="rounded-xl border border-border/50 bg-secondary/20">
            <div className="space-y-1.5 p-6 pb-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-4 p-6 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Model behavior section */}
          <div className="rounded-xl border border-border/50 bg-secondary/20">
            <div className="space-y-1.5 p-6 pb-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-60" />
            </div>
            <div className="space-y-4 p-6 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentDetailLoading
