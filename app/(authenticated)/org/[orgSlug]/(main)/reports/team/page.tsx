import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { parseDateRange } from '@/_utils/date-range'
import { getTeamPerformance } from '@/_data-access/reports/team/get-team-performance'
import { Card } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'
import type { ReportsFilters } from '@/_data-access/reports/shared/reports-types'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { TeamRankingTable } from './_components/team-ranking-table'
import { TeamGoalsStrip } from './_components/team-goals-strip'

interface TeamReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string; assignee?: string }>
}

export default async function TeamReportPage({ params, searchParams }: TeamReportPageProps) {
  const { orgSlug } = await params
  const { start, end, assignee } = await searchParams

  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/reports/overview`)
  }

  const dateRange = parseDateRange(start, end)
  const filters: ReportsFilters = { assignee }

  const teamData = await getTeamPerformance(ctx, dateRange, filters)
  const section = findReportSection('team')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Time'}
        description={section?.description}
      />

      {/* Bloco 1: Ranking */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ranking do Período</h2>
        <Card>
          <TeamRankingTable data={teamData} />
        </Card>
      </div>

      {/* Bloco 2: Metas individuais */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">Metas individuais</h2>
          <p className="text-xs text-muted-foreground">Progresso das metas de cada membro da equipe.</p>
        </div>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          }
        >
          <TeamGoalsStrip orgSlug={orgSlug} />
        </Suspense>
      </div>
    </div>
  )
}
