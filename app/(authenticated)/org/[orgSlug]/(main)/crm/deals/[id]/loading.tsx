import { Skeleton } from '@/_components/ui/skeleton'
import {
  InfoCardSkeleton,
  ContactWidgetSkeleton,
  CompanyOwnerSkeleton,
  NotesSkeleton,
  ActivityTimelineSkeleton,
} from './_components/skeletons'

export default function DealDetailLoading() {
  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Voltar */}
        <Skeleton className="h-9 w-24 rounded-md" />

        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <div className="mt-4 flex items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-10 w-44 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="grid h-12 w-full grid-cols-4 rounded-md border border-border/50 bg-tab/30 p-1">
        <Skeleton className="h-full rounded-md" />
        <Skeleton className="mx-1 h-full rounded-md opacity-50" />
        <Skeleton className="mx-1 h-full rounded-md opacity-50" />
        <Skeleton className="h-full rounded-md opacity-50" />
      </div>

      {/* Tab content: Summary layout */}
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[35%_1fr]">
          {/* Left column */}
          <div className="space-y-4">
            <InfoCardSkeleton />
            <ContactWidgetSkeleton />
            <CompanyOwnerSkeleton />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <NotesSkeleton />
            <ActivityTimelineSkeleton />
          </div>
        </div>

        {/* Responsável bar */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}
