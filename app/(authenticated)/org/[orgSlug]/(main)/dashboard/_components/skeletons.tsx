import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'

export function KpiGridSkeleton() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex h-full w-full flex-col">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="mb-0.5 h-5 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PipelineStatusSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="size-[160px] rounded-full" />
      </CardContent>
    </Card>
  )
}

export function ChartsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

export function GreetingSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

export function FunnelSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          {[64, 52, 40, 28, 18].map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function BottomSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, colIndex) => (
        <Card key={colIndex}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3 py-3">
                  <Skeleton className="size-4 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DashboardTabsSkeleton() {
  return <Skeleton className="h-12 w-[280px] rounded-md" />
}

// --- Skeletons do Dashboard Inbox ---

export function InboxKpiSkeleton() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex h-full w-full flex-col">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mb-0.5 h-5 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function InboxChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

export function InboxHeatmapSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-1">
              <Skeleton className="h-4 w-8 shrink-0" />
              <div className="grid flex-1 grid-cols-12 gap-0.5">
                {Array.from({ length: 12 }).map((__, colIndex) => (
                  <Skeleton key={colIndex} className="aspect-square rounded-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function InboxBottomSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, colIndex) => (
        <Card key={colIndex}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <div key={rowIndex} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-2.5 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function InboxDashboardSkeleton() {
  return (
    <>
      {/* Row 1: KPIs + Canal */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <InboxKpiSkeleton />
        </div>
        <PipelineStatusSkeleton />
      </div>
      {/* Row 2: Volume */}
      <InboxChartSkeleton />
      {/* Row 3: Heatmap */}
      <InboxHeatmapSkeleton />
      {/* Row 4: Labels + IA vs Humano */}
      <InboxBottomSkeleton />
      {/* Row 5: Atendentes */}
      <InboxChartSkeleton />
    </>
  )
}

export function AiDashboardSkeleton() {
  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <KpiGridSkeleton />
        </div>
        <PipelineStatusSkeleton />
      </div>
      {/* Row 2 */}
      <ChartsSkeleton />
      {/* Row 3: Breakdown por agente */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
