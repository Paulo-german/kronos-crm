import { Skeleton } from '@/_components/ui/skeleton'
import { LifecycleFunnelSkeleton } from './_components/skeletons'

export default function DashboardV2Loading() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-end">
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <LifecycleFunnelSkeleton />
    </div>
  )
}
