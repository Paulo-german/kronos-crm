import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'

function InfoCardSkeleton() {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Título */}
        <div className="border-b pb-4">
          <Skeleton className="h-5 w-3/4" />
        </div>
        {/* Valor */}
        <div className="flex items-center gap-3 rounded-md bg-primary/5 p-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        {/* Etapa */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        {/* Datas */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ContactWidgetSkeleton() {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CompanyOwnerSkeleton() {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

function NotesSkeleton() {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full rounded-md" />
      </CardContent>
    </Card>
  )
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-48" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative flex gap-4 border-l-2 border-border pl-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50 bg-tab/30 p-1">
        <Skeleton className="h-full rounded-md" />
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
  )
}
