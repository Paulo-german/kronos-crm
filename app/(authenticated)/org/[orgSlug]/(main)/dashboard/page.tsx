import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { KpiGrid } from './_components/kpi-grid'
import { PipelineStatusSection } from './_components/pipeline-status-section'
import { ChartsSection } from './_components/charts-section'
import { FunnelSection } from './_components/funnel-section'
import { DateRangePicker } from './_components/date-range-picker'
import { DashboardTabs } from './_components/dashboard-tabs'
import { TaskListSection } from './_components/task-list-section'
import { RecentActivitySection } from './_components/recent-activity-section'
import { AiDashboardSection } from './_components/ai-dashboard-section'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { DASHBOARD_TOUR_STEPS } from '@/_lib/onboarding/tours/dashboard-tour'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  ChartsSkeleton,
  AiDashboardSkeleton,
  FunnelSkeleton,
  BottomSectionSkeleton,
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
      {/* Row 0: Tabs + DateRange */}
      <div className="flex items-center justify-between">
        <DashboardTabs activeTab={activeTab} />
        <DateRangePicker />
      </div>

      {activeTab === 'reports' ? (
        <>
          {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
          <div
            data-tour="dashboard-kpis"
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3"
          >
            <div className="flex lg:col-span-2">
              <Suspense fallback={<KpiGridSkeleton />}>
                <KpiGrid ctx={ctx} dateRange={dateRange} orgSlug={orgSlug} />
              </Suspense>
            </div>
            <Suspense fallback={<PipelineStatusSkeleton />}>
              <PipelineStatusSection ctx={ctx} dateRange={dateRange} />
            </Suspense>
          </div>

          {/* Row 2: Funil de Conversão horizontal (full width, compacto) */}
          <Suspense fallback={<FunnelSkeleton />}>
            <FunnelSection ctx={ctx} dateRange={dateRange} />
          </Suspense>

          {/* Row 3: Revenue Chart (full width) */}
          <div data-tour="dashboard-charts">
            <Suspense fallback={<ChartsSkeleton />}>
              <ChartsSection ctx={ctx} dateRange={dateRange} />
            </Suspense>
          </div>

          {/* Row 4: Tasks (1/2) + Atividades Recentes (1/2) */}
          <Suspense fallback={<BottomSectionSkeleton />}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TaskListSection ctx={ctx} orgSlug={orgSlug} />
              <RecentActivitySection ctx={ctx} orgSlug={orgSlug} />
            </div>
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<AiDashboardSkeleton />}>
          <AiDashboardSection orgId={ctx.orgId} dateRange={dateRange} />
        </Suspense>
      )}

      <PageTourTrigger tourId="dashboard" steps={DASHBOARD_TOUR_STEPS} />
    </div>
  )
}
