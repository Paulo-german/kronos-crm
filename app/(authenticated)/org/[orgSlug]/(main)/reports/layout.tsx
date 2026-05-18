import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { isElevated } from '@/_lib/rbac'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { ReportsGlobalFilters } from './_components/reports-global-filters'
import { ReportsPlanGate } from './_components/reports-plan-gate'

interface ReportsLayoutProps {
  params: Promise<{ orgSlug: string }>
  children: React.ReactNode
}

export default async function ReportsLayout({ params, children }: ReportsLayoutProps) {
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
    <div className="flex flex-col gap-6 p-6">
      <ReportsGlobalFilters isElevated={elevated} members={members} />
      {children}
    </div>
  )
}
