import Header, {
  HeaderLeft,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'
import { Skeleton } from '@/_components/ui/skeleton'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  ChartsSkeleton,
} from './_components/skeletons'

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Dashboard</HeaderTitle>
          <HeaderSubTitle>Visão geral da sua operação</HeaderSubTitle>
        </HeaderLeft>
        <Skeleton className="h-8 w-36" />
      </Header>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <KpiGridSkeleton />
        </div>
        <PipelineStatusSkeleton />
      </div>

      <ChartsSkeleton />
    </div>
  )
}
