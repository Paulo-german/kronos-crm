import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAiMetricsForReports } from '@/_data-access/reports/ai/get-ai-metrics-for-reports'
import { parseReportsSearchParams } from '@/_data-access/reports/shared/reports-filters'
import { isElevated } from '@/_lib/rbac'
import type { ReportsFilters } from '@/_data-access/reports/shared/reports-types'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '@/_data-access/reports/shared/reports-types'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { AiKpiGrid } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/v1/_components/ai-kpi-grid'
import { AiPlanUsageCard } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/v1/_components/ai-plan-usage-card'
import { AiUsageBarChart } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/v1/_components/ai-usage-bar-chart'
import { AiAgentBreakdownCard } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/v1/_components/ai-agent-breakdown-card'
import { AiDashboardSkeleton } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/v1/_components/skeletons'

interface AiReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface AiReportContentProps {
  ctx: RBACContext
  dateRange: DateRange
  filters: ReportsFilters
}

async function AiReportContent({ ctx, dateRange, filters }: AiReportContentProps) {
  const metrics = await getAiMetricsForReports(ctx, dateRange, filters)

  return (
    <>
      {/* Row 1: KPIs (2/3) + Plan Usage (1/3) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <AiKpiGrid metrics={metrics} />
        </div>
        <AiPlanUsageCard metrics={metrics} />
      </div>

      {/* Row 2: Bar Chart Créditos + Mensagens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consumo no Período</CardTitle>
        </CardHeader>
        <CardContent>
          <AiUsageBarChart data={metrics.monthlyHistory} />
        </CardContent>
      </Card>

      {/* Row 3: Breakdown por agente (só renderiza se houver dados) */}
      {metrics.agentBreakdown.length > 0 && (
        <AiAgentBreakdownCard data={metrics.agentBreakdown} />
      )}
    </>
  )
}

export default async function AiReportPage({ params, searchParams }: AiReportPageProps) {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const { dateRange, filters } = parseReportsSearchParams(resolvedSearchParams)

  // Filtro por responsável só vale para perfis elevados — MEMBER nunca filtra por outro membro.
  const scopedFilters: ReportsFilters = isElevated(ctx.userRole)
    ? filters
    : { ...filters, assignee: undefined }

  const section = findReportSection('ai')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'IA'}
        description={section?.description}
      />

      <Suspense fallback={<AiDashboardSkeleton />}>
        <AiReportContent ctx={ctx} dateRange={dateRange} filters={scopedFilters} />
      </Suspense>
    </div>
  )
}
