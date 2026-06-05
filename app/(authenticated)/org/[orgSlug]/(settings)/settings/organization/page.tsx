import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { OrganizationSettingsForm } from '@/(authenticated)/org/[orgSlug]/(settings)/settings/organization/_components/organization-settings-form'

interface OrganizationSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings/organization`)
  }

  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    redirect(`/org/${orgSlug}/settings/organization`)
  }

  const { plan } = await getPlanLimits(orgId)

  return (
    <div className="flex flex-col justify-center gap-2 p-6 md:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Organização</h1>
        <p className="text-muted-foreground">
          Informações e configurações da organização.
        </p>
      </div>

      <OrganizationSettingsForm
        orgSlug={orgSlug}
        organization={organization}
        currentPlan={plan}
      />
    </div>
  )
}
