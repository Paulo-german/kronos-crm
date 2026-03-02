import { Skeleton } from '@/_components/ui/skeleton'

const InboxLoading = () => {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 pt-3 md:px-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      {/* Chat layout skeleton */}
      <div className="mt-6 flex flex-1 border-t border-border/50">
        {/* Sidebar skeleton */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border/50">
          <div className="border-b border-border/50 p-4">
            <Skeleton className="mb-3 h-6 w-24" />
            <Skeleton className="mb-3 h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1 space-y-1 p-2">
            {['conv-1', 'conv-2', 'conv-3', 'conv-4', 'conv-5'].map(
              (key) => (
                <div key={key} className="flex items-start gap-3 rounded-lg p-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Chat panel skeleton */}
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-border/50 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 space-y-4 p-6">
            <div className="flex justify-start">
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 w-72 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-2xl" />
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border/50 p-4">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InboxLoading
