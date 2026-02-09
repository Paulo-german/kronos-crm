import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { OrganizationSettingsForm } from './_components/organization-settings-form'

interface OrganizationSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    redirect(`/org/${orgSlug}/settings`)
  }

  const { plan } = await getPlanLimits(orgId)

  return (
    <div className="flex flex-col justify-center gap-2">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

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
