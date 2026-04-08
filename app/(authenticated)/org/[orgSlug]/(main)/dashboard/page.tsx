import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getProducts } from '@/_data-access/product/get-products'
import { parseDateRange } from '@/_utils/date-range'
import { isElevated } from '@/_lib/rbac/permissions'
import type { DashboardFilters } from '@/_data-access/dashboard'
import type { DealStatus, DealPriority } from '@prisma/client'
import { KpiGrid } from './_components/kpi-grid'
import { PipelineStatusSection } from './_components/pipeline-status-section'
import { ChartsSection } from './_components/charts-section'
import { FunnelSection } from './_components/funnel-section'
import { DateRangePicker } from './_components/date-range-picker'
import { DashboardTabs } from './_components/dashboard-tabs'
import { DashboardFiltersBar } from './_components/dashboard-filters-bar'
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
  searchParams: Promise<{
    start?: string
    end?: string
    tab?: string
    pipelineId?: string
    assignee?: string
    status?: string
    priority?: string
    inactiveDays?: string
    productId?: string
  }>
}

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const { orgSlug } = await params
  const {
    start,
    end,
    tab,
    pipelineId,
    assignee,
    status,
    priority,
    inactiveDays,
    productId,
  } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const activeTab = tab === 'ai' ? 'ai' : 'reports'
  const elevated = isElevated(ctx.userRole)

  // Fetch paralelo: pipelines + membros (apenas se elevated) + produtos (todos, ativos e inativos)
  const [pipelines, membersData, products] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    elevated ? getOrganizationMembers(ctx.orgId) : null,
    getProducts(ctx.orgId),
  ])

  // Constrói o objeto de filtros a partir dos query params
  // RBAC: assignee só é aplicado server-side se o usuário for elevated
  const filters: DashboardFilters = {
    pipelineId: pipelineId ?? undefined,
    assignee: elevated ? (assignee ?? undefined) : undefined,
    status: status
      ? (status.split(',') as DealStatus[])
      : undefined,
    priority: priority
      ? (priority.split(',') as DealPriority[])
      : undefined,
    inactiveDays: inactiveDays ? parseInt(inactiveDays, 10) : undefined,
    productId: productId ?? undefined,
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Row 0: Tabs + Date Range */}
      <div className="flex items-center justify-between">
        <DashboardTabs activeTab={activeTab} />
        <DateRangePicker />
      </div>

      {/* Row 1: Filtros de vendas — abaixo do seletor de mês, apenas na tab reports */}
      {activeTab === 'reports' && (
        <DashboardFiltersBar
          pipelines={pipelines}
          members={membersData?.accepted ?? null}
          products={products}
          isElevated={elevated}
        />
      )}

      {activeTab === 'reports' ? (
        <>
          {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
          <div
            data-tour="dashboard-kpis"
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3"
          >
            <div className="flex lg:col-span-2">
              <Suspense fallback={<KpiGridSkeleton />}>
                <KpiGrid ctx={ctx} dateRange={dateRange} orgSlug={orgSlug} filters={filters} />
              </Suspense>
            </div>
            <Suspense fallback={<PipelineStatusSkeleton />}>
              <PipelineStatusSection ctx={ctx} dateRange={dateRange} filters={filters} />
            </Suspense>
          </div>

          {/* Row 2: Funil de Conversão — visível apenas quando um pipeline específico está selecionado */}
          {filters.pipelineId && (
            <Suspense fallback={<FunnelSkeleton />}>
              <FunnelSection ctx={ctx} dateRange={dateRange} filters={filters} />
            </Suspense>
          )}

          {/* Row 3: Revenue Chart (full width) */}
          <div data-tour="dashboard-charts">
            <Suspense fallback={<ChartsSkeleton />}>
              <ChartsSection ctx={ctx} dateRange={dateRange} filters={filters} />
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
