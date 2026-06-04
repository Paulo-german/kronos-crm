import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { parseDateRange } from '@/_utils/date-range'
import { getTeamPerformance } from '@/_data-access/reports/team/get-team-performance'
import { getTeamMemberTaskBreakdown } from '@/_data-access/reports/team/get-team-member-task-breakdown'
import { getTeamMemberById } from '@/_data-access/reports/team/get-team-member-by-id'
import { Card } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'
import type { ReportsFilters } from '@/_data-access/reports/shared/reports-types'
import { findReportSection } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_config/report-sections'
import { ReportsSectionHeader } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_components/reports-section-header'
import { TeamRankingTable } from '@/(authenticated)/org/[orgSlug]/(main)/reports/team/_components/team-ranking-table'
import { TeamGoalsStrip } from '@/(authenticated)/org/[orgSlug]/(main)/reports/team/_components/team-goals-strip'
import { MemberSpotlight } from '@/(authenticated)/org/[orgSlug]/(main)/reports/team/_components/member-spotlight'
import { TeamMemberDrawerWrapper } from '@/(authenticated)/org/[orgSlug]/(main)/reports/team/_components/team-member-drawer-wrapper'

interface TeamReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string; assignee?: string; member?: string }>
}

export default async function TeamReportPage({ params, searchParams }: TeamReportPageProps) {
  const { orgSlug } = await params
  const { start, end, assignee, member } = await searchParams

  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/crm/reports/overview`)
  }

  const dateRange = parseDateRange(start, end)
  const rankingFilters: ReportsFilters = {}

  const spotlightFetch = assignee
    ? Promise.all([getTeamMemberTaskBreakdown(ctx, assignee, dateRange), getTeamMemberById(ctx.orgId, assignee)])
    : Promise.resolve(null)

  const drawerFetch = member
    ? Promise.all([getTeamMemberTaskBreakdown(ctx, member, dateRange), getTeamMemberById(ctx.orgId, member)])
    : Promise.resolve(null)

  const [teamData, spotlightResult, drawerResult] = await Promise.all([
    getTeamPerformance(ctx, dateRange, rankingFilters),
    spotlightFetch,
    drawerFetch,
  ])

  const spotlightBreakdown = spotlightResult?.[0] ?? null
  const spotlightBasicInfo = spotlightResult?.[1] ?? null
  const drawerBreakdown = drawerResult?.[0] ?? null
  const drawerBasicInfo = drawerResult?.[1] ?? null

  const drawerMember = member ? (teamData.find((row) => row.userId === member) ?? null) : null
  const spotlightMember = assignee
    ? (teamData.find((row) => row.userId === assignee) ?? null)
    : null

  const section = findReportSection('team')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Time'}
        description={section?.description}
      />

      {assignee && spotlightBasicInfo && (
        <MemberSpotlight
          member={spotlightMember}
          basicInfo={spotlightBasicInfo}
          taskBreakdown={spotlightBreakdown ?? []}
        />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ranking do Período</h2>
        <Card>
          <TeamRankingTable data={teamData} />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">Metas individuais</h2>
          <p className="text-xs text-muted-foreground">
            Progresso das metas de cada membro da equipe.
          </p>
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
          <TeamGoalsStrip orgSlug={orgSlug} dateRange={dateRange} />
        </Suspense>
      </div>

      {member && (
        <TeamMemberDrawerWrapper
          member={drawerMember}
          basicInfo={drawerBasicInfo}
          taskBreakdown={drawerBreakdown ?? []}
        />
      )}
    </div>
  )
}
