import { Fragment } from 'react'
import { Skeleton } from '@/_components/ui/skeleton'

export function LifecycleFunnelSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Desktop */}
      <div className="hidden gap-2 lg:flex">
        {Array.from({ length: 4 }).map((_skeleton, index) => (
          <Fragment key={index}>
            <Skeleton className="h-36 flex-1 rounded-xl" />
            {index < 3 && <div className="w-10 shrink-0" />}
          </Fragment>
        ))}
      </div>
      {/* Mobile */}
      <div className="grid grid-cols-2 gap-4 lg:hidden">
        {Array.from({ length: 4 }).map((_skeleton, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[278px] rounded-xl" />
    </div>
  )
}

export function GoalsSectionSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-5 w-36" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

export function AttentionSectionSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-5 w-48" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

export function RecentMovementSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-5 w-44" />
      <div className="rounded-xl border bg-card">
        <div className="space-y-1 p-4">
          {Array.from({ length: 8 }).map((_skeleton, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
