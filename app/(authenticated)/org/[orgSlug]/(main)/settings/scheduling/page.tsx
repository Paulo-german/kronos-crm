import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getSchedulingSettings } from '@/_data-access/organization/get-scheduling-settings'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { DistributionModelForm } from './_components/distribution-model-form'

interface SchedulingSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function SchedulingSettingsPage({
  params,
}: SchedulingSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [settings, professionals] = await Promise.all([
    getSchedulingSettings(orgId),
    getProfessionals(orgId),
  ])

  const activeProfessionals = professionals
    .filter((professional) => professional.isActive)
    .map((professional) => ({ id: professional.id, name: professional.name }))

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
