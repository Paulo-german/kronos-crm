import { Skeleton } from '@/_components/ui/skeleton'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  FunnelSkeleton,
  ChartsSkeleton,
  BottomSectionSkeleton,
  DashboardTabsSkeleton,
} from './_components/skeletons'

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6">
      {/* Row 0: Tabs + DateRangePicker */}
      <div className="flex items-center justify-between">
        <DashboardTabsSkeleton />
        <Skeleton className="h-10 w-[260px] rounded-md" />
      </div>

      {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <KpiGridSkeleton />
        </div>
        <PipelineStatusSkeleton />
      </div>

      {/* Row 2: Funil de Conversão */}
      <FunnelSkeleton />

      {/* Row 3: Charts */}
      <ChartsSkeleton />

      {/* Row 4: Tasks + Atividades Recentes */}
      <BottomSectionSkeleton />
    </div>
  )
}
