import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getSchedulingSettings } from '@/_data-access/organization/get-scheduling-settings'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { DistributionModelForm } from '@/(authenticated)/org/[orgSlug]/(main)/settings/scheduling/_components/distribution-model-form'

interface SchedulingSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function SchedulingSettingsPage({
  params,
}: SchedulingSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [settings, professionals] = await Promise.all([
    getSchedulingSettings(orgId),
    getProfessionals(orgId),
  ])

  const activeProfessionals = professionals
    .filter((professional) => professional.isActive)
    .map((professional) => ({ id: professional.id, name: professional.name }))

  return (
    <div className="flex flex-col justify-center gap-2 p-6 md:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Distribuição de Agendamentos</h1>
        <p className="text-muted-foreground">
          Configure como o sistema distribui os agendamentos entre os profissionais.
        </p>
      </div>

      <DistributionModelForm
        settings={settings}
        allProfessionals={activeProfessionals}
      />
    </div>
  )
}
