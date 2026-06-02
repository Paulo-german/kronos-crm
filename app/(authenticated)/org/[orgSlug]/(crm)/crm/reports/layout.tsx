import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { isElevated } from '@/_lib/rbac'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { ReportsGlobalFilters } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_components/reports-global-filters'
import { ReportsPlanGate } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_components/reports-plan-gate'
import { ReportsNavTabs } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_components/reports-nav-tabs'
import { REPORT_SECTIONS } from '@/(authenticated)/org/[orgSlug]/(main)/reports/_config/report-sections'

const CRM_REPORT_SLUGS = ['overview', 'pipeline', 'team', 'products', 'lost-deals']
const CRM_REPORT_SECTIONS = REPORT_SECTIONS.filter((section) =>
  CRM_REPORT_SLUGS.includes(section.slug),
)

interface CrmReportsLayoutProps {
  params: Promise<{ orgSlug: string }>
  children: React.ReactNode
}

export default async function CrmReportsLayout({ params, children }: CrmReportsLayoutProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const { plan } = await getPlanLimits(ctx.orgId)
  if (!plan || plan === 'light') {
    return <ReportsPlanGate orgSlug={orgSlug} />
  }

  const elevated = isElevated(ctx.userRole)
  const membersData = elevated ? await getOrganizationMembers(ctx.orgId) : null
  const members =
    membersData?.accepted.map((member) => ({
      userId: member.userId ?? '',
      fullName: member.user?.fullName ?? member.email,
      avatarUrl: member.user?.avatarUrl ?? null,
    })) ?? null

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      <ReportsGlobalFilters isElevated={elevated} members={members} />
      <ReportsNavTabs isElevated={elevated} basePath="crm/reports" sections={CRM_REPORT_SECTIONS} />
      {children}
    </div>
  )
}
