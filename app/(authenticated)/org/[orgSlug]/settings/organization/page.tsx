import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { OrganizationSettingsForm } from './_components/organization-settings-form'

interface OrganizationSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    redirect(`/org/${orgSlug}/settings`)
  }

  return (
    <div className="flex flex-col justify-center gap-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Organização</h1>
        <p className="text-muted-foreground">
          Informações e configurações da organização.
        </p>
      </div>

      <OrganizationSettingsForm organization={organization} />
    </div>
  )
}
