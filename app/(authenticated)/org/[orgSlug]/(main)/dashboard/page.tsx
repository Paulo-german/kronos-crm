import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getProducts } from '@/_data-access/product/get-products'
import { getConversationLabels } from '@/_data-access/conversation-label/get-conversation-labels'
import { parseDateRange } from '@/_utils/date-range'
import { isElevated } from '@/_lib/rbac/permissions'
import type { DashboardFilters, InboxDashboardFilters } from '@/_data-access/dashboard'
import type { DealStatus, DealPriority, InboxChannel, ConversationStatus } from '@prisma/client'
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
import { InboxDashboardFiltersBar } from './_components/inbox-dashboard-filters-bar'
import { InboxKpiGrid } from './_components/inbox-kpi-grid'
import { InboxVolumeSection } from './_components/inbox-volume-section'
import { InboxChannelSection } from './_components/inbox-channel-section'
import { InboxHeatmapSection } from './_components/inbox-heatmap-section'
import { InboxTopLabelsSection } from './_components/inbox-top-labels-section'
import { InboxAiHumanSection } from './_components/inbox-ai-human-section'
import { InboxAttendantSection } from './_components/inbox-attendant-section'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { DASHBOARD_TOUR_STEPS } from '@/_lib/onboarding/tours/dashboard-tour'
import {
  KpiGridSkeleton,
  PipelineStatusSkeleton,
  ChartsSkeleton,
  AiDashboardSkeleton,
  FunnelSkeleton,
  BottomSectionSkeleton,
  InboxKpiSkeleton,
  InboxChartSkeleton,
  InboxHeatmapSkeleton,
  InboxBottomSkeleton,
} from './_components/skeletons'

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    start?: string
    end?: string
    tab?: string
    // Filtros de Relatórios (deals/pipeline)
    pipelineId?: string
    assignee?: string
    status?: string
    priority?: string
    inactiveDays?: string
    productId?: string
    // Filtros de Inbox
    channel?: string
    labelId?: string
    inboxStatus?: string
    aiVsHuman?: string
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
    channel,
    labelId,
    inboxStatus,
    aiVsHuman,
  } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const activeTab = tab === 'ai' ? 'ai' : tab === 'inbox' ? 'inbox' : 'reports'
  const elevated = isElevated(ctx.userRole)

  // Fetch paralelo baseado na tab ativa para evitar fetches desnecessários
  const [pipelines, membersData, products, conversationLabels] =
    await Promise.all([
      // Pipelines: necessário apenas na tab reports
      activeTab === 'reports'
        ? getOrgPipelines(ctx.orgId)
        : Promise.resolve([]),
      // Membros: necessário em reports (elevated) e inbox (elevated)
      elevated ? getOrganizationMembers(ctx.orgId) : Promise.resolve(null),
      // Produtos: necessário apenas na tab reports
      activeTab === 'reports'
        ? getProducts(ctx.orgId)
        : Promise.resolve([]),
      // Labels: necessário apenas na tab inbox para o filtro
      activeTab === 'inbox'
        ? getConversationLabels(ctx.orgId)
        : Promise.resolve([]),
    ])

  // Filtros de Relatórios — RBAC: assignee só aplicado server-side se elevated
  const filters: DashboardFilters = {
    pipelineId: pipelineId ?? undefined,
    assignee: elevated ? (assignee ?? undefined) : undefined,
    status: status ? (status.split(',') as DealStatus[]) : undefined,
    priority: priority
      ? (priority.split(',') as DealPriority[])
      : undefined,
    inactiveDays: inactiveDays ? parseInt(inactiveDays, 10) : undefined,
    productId: productId ?? undefined,
  }

  // Filtros de Inbox — RBAC: assignee só aplicado server-side se elevated
  const inboxFilters: InboxDashboardFilters = {
    channel: channel as InboxChannel | undefined,
    assignee: elevated ? (assignee ?? undefined) : undefined,
    labelId: labelId ?? undefined,
    status: inboxStatus as ConversationStatus | undefined,
    aiVsHuman: aiVsHuman === 'ai' || aiVsHuman === 'human'
      ? aiVsHuman
      : undefined,
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Row 0: Tabs + Date Range */}
      <div className="flex items-center justify-between">
        <DashboardTabs activeTab={activeTab} />
        <DateRangePicker />
      </div>

      {/* Tab: Relatórios */}
      {activeTab === 'reports' && (
        <>
          <DashboardFiltersBar
            pipelines={pipelines}
            members={membersData?.accepted ?? null}
            products={products}
            isElevated={elevated}
          />

          {/* Row 1: KPIs (2/3) + Pipeline Status (1/3) */}
          <div
            data-tour="dashboard-kpis"
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3"
          >
            <div className="flex lg:col-span-2">
              <Suspense fallback={<KpiGridSkeleton />}>
                <KpiGrid
                  ctx={ctx}
                  dateRange={dateRange}
                  orgSlug={orgSlug}
                  filters={filters}
                />
              </Suspense>
            </div>
            <Suspense fallback={<PipelineStatusSkeleton />}>
              <PipelineStatusSection
                ctx={ctx}
                dateRange={dateRange}
                filters={filters}
              />
            </Suspense>
          </div>

          {/* Row 2: Funil de Conversão — apenas quando pipeline específico selecionado */}
          {filters.pipelineId && (
            <Suspense fallback={<FunnelSkeleton />}>
              <FunnelSection
                ctx={ctx}
                dateRange={dateRange}
                filters={filters}
              />
            </Suspense>
          )}

          {/* Row 3: Revenue Chart (full width) */}
          <div data-tour="dashboard-charts">
            <Suspense fallback={<ChartsSkeleton />}>
              <ChartsSection
                ctx={ctx}
                dateRange={dateRange}
                filters={filters}
              />
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
      )}

      {/* Tab: Inbox */}
      {activeTab === 'inbox' && (
        <>
          {/* Filtros Inbox */}
          <InboxDashboardFiltersBar
            members={membersData?.accepted ?? null}
            labels={conversationLabels}
            isElevated={elevated}
          />

          {/* Row 1: KPIs (2/3) + Canal Donut (1/3) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            <div className="flex lg:col-span-2">
              <Suspense fallback={<InboxKpiSkeleton />}>
                <InboxKpiGrid
                  ctx={ctx}
                  dateRange={dateRange}
                  filters={inboxFilters}
                />
              </Suspense>
            </div>
            <Suspense fallback={<PipelineStatusSkeleton />}>
              <InboxChannelSection
                ctx={ctx}
                dateRange={dateRange}
                filters={inboxFilters}
              />
            </Suspense>
          </div>

          {/* Row 2: Volume de Conversas (full width) */}
          <Suspense fallback={<InboxChartSkeleton />}>
            <InboxVolumeSection
              ctx={ctx}
              dateRange={dateRange}
              filters={inboxFilters}
            />
          </Suspense>

          {/* Row 3: Heatmap (full width) */}
          <Suspense fallback={<InboxHeatmapSkeleton />}>
            <InboxHeatmapSection
              ctx={ctx}
              dateRange={dateRange}
              filters={inboxFilters}
            />
          </Suspense>

          {/* Row 4: Top Etiquetas (1/2) + IA vs Humano (1/2) */}
          <Suspense fallback={<InboxBottomSkeleton />}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InboxTopLabelsSection
                ctx={ctx}
                dateRange={dateRange}
                filters={inboxFilters}
              />
              <InboxAiHumanSection
                ctx={ctx}
                dateRange={dateRange}
                filters={inboxFilters}
              />
            </div>
          </Suspense>

          {/* Row 5: Performance por Atendente (elevated only, full width) */}
          {elevated && (
            <Suspense fallback={<InboxChartSkeleton />}>
              <InboxAttendantSection
                ctx={ctx}
                dateRange={dateRange}
                filters={inboxFilters}
              />
            </Suspense>
          )}
        </>
      )}

      {/* Tab: IA */}
      {activeTab === 'ai' && (
        <Suspense fallback={<AiDashboardSkeleton />}>
          <AiDashboardSection orgId={ctx.orgId} dateRange={dateRange} />
        </Suspense>
      )}

      <PageTourTrigger tourId="dashboard" steps={DASHBOARD_TOUR_STEPS} />
    </div>
  )
}
