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
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {['row-1', 'row-2', 'row-3', 'row-4', 'row-5'].map((rowKey) => (
          <Skeleton key={rowKey} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

export default AiAgentLoading
