import { Suspense } from 'react'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { KpiGrid } from './_components/kpi-grid'
import { PipelineStatusSection } from './_components/pipeline-status-section'
import { ChartsSection } from './_components/charts-section'
import { DateRangePicker } from './_components/date-range-picker'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  ChartsSkeleton,
} from './_components/skeletons'

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const { orgSlug } = await params
  const { start, end } = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)

  return (
    <div className="flex h-full flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Dashboard</HeaderTitle>
          <HeaderSubTitle>Visão geral da sua operação</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <DateRangePicker />
        </HeaderRight>
      </Header>

      {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <Suspense fallback={<KpiGridSkeleton />}>
            <KpiGrid ctx={ctx} dateRange={dateRange} />
          </Suspense>
        </div>
        <Suspense fallback={<PipelineStatusSkeleton />}>
          <PipelineStatusSection ctx={ctx} />
        </Suspense>
      </div>

      {/* Row 2: Charts */}
      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsSection ctx={ctx} />
      </Suspense>
    </div>
  )
}
