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
import { DashboardTabs } from './_components/dashboard-tabs'
import { AiDashboardSection } from './_components/ai-dashboard-section'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  ChartsSkeleton,
  AiDashboardSkeleton,
} from './_components/skeletons'

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string; tab?: string }>
}

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const { orgSlug } = await params
  const { start, end, tab } = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const activeTab = tab === 'ai' ? 'ai' : 'reports'

  return (
    <div className="flex h-full flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Dashboard</HeaderTitle>
          <HeaderSubTitle>Visão geral da sua operação</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          {activeTab === 'reports' && <DateRangePicker />}
        </HeaderRight>
      </Header>

      <DashboardTabs activeTab={activeTab} />

      {activeTab === 'reports' ? (
        <>
          {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            <div className="flex lg:col-span-2">
              <Suspense fallback={<KpiGridSkeleton />}>
                <KpiGrid ctx={ctx} dateRange={dateRange} orgSlug={orgSlug} />
              </Suspense>
            </div>
            <Suspense fallback={<PipelineStatusSkeleton />}>
              <PipelineStatusSection ctx={ctx} dateRange={dateRange} />
            </Suspense>
          </div>

          {/* Row 2: Charts */}
          <Suspense fallback={<ChartsSkeleton />}>
            <ChartsSection ctx={ctx} dateRange={dateRange} />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<AiDashboardSkeleton />}>
          <AiDashboardSection orgId={ctx.orgId} />
        </Suspense>
      )}
    </div>
  )
}
