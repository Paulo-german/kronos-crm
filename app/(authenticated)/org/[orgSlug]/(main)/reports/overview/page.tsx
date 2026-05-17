import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getKpiMetricsForReports } from '@/_data-access/reports/overview/get-kpi-metrics-for-reports'
import { getRevenueOverTimeForReports } from '@/_data-access/reports/overview/get-revenue-over-time-for-reports'
import { getChannelAttribution } from '@/_data-access/reports/overview/get-channel-attribution'
import { parseDateRange } from '@/_utils/date-range'
import type { ReportsFilters } from '@/_data-access/reports/shared/reports-types'
import { Skeleton } from '@/_components/ui/skeleton'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { ReportsDrillDownSheet } from '../_components/reports-drill-down-sheet'
import { OverviewPageClient } from './_components/overview-page-client'
import { OverviewGoalsStrip } from './_components/overview-goals-strip'
import { OverviewRevenueChart } from './_components/overview-revenue-chart'

interface OverviewPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    start?: string
    end?: string
    assignee?: string
    attribution?: string
  }>
}

export default async function OverviewPage({ params, searchParams }: OverviewPageProps) {
  const { orgSlug } = await params
  const { start, end, assignee, attribution } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const attributionModel = (attribution === 'last' || attribution === 'per_deal') ? attribution : 'first'

  const filters: ReportsFilters = {
    assignee: assignee ?? undefined,
  }

  const [kpi, revenueData, channelAttribution] = await Promise.all([
    getKpiMetricsForReports(ctx, dateRange, filters),
    getRevenueOverTimeForReports(ctx, dateRange, filters),
    getChannelAttribution(ctx, dateRange, { model: attributionModel, includeManual: false }),
  ])

  const section = findReportSection('overview')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Visão geral'}
        description={section?.description}
      />

      {/* Bloco 1: KPIs + atribuição (estado interativo gerenciado no client) */}
      <OverviewPageClient
        kpi={kpi}
        channelAttribution={channelAttribution}
      />

      {/* Bloco 2: Receita no período */}
      <OverviewRevenueChart data={revenueData} />

      {/* Bloco 3: Metas de organização */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">Metas da organização</h2>
          <p className="text-xs text-muted-foreground">Progresso atual das metas ativas com scope ORG.</p>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          }
        >
          <OverviewGoalsStrip orgSlug={orgSlug} />
        </Suspense>
      </div>

      {/* Sheet de drill-down (controlado por nuqs, sem props extras) */}
      <ReportsDrillDownSheet />
    </div>
  )
}
