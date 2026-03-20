import { Skeleton } from '@/_components/ui/skeleton'

const AiAgentLoading = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pt-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'].map(
          (key) => (
            <div
              key={key}
              className="flex min-h-[180px] flex-col gap-3 rounded-xl border p-5"
            >
              {/* Status toggle row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
              {/* Name + badge */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              {/* Stats row */}
              <div className="mt-auto flex items-center gap-4 border-t pt-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default AiAgentLoading
