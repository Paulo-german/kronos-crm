import { redirect } from 'next/navigation'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { getServices } from '@/_data-access/service/get-services'
import { getAcceptedMembersWithoutProfessional } from '@/_data-access/professional/get-accepted-members-without-professional'

import { ProfessionalsDataTable } from '@/(authenticated)/org/[orgSlug]/(main)/settings/professionals/_components/professionals-data-table'
import CreateProfessionalButton from '@/(authenticated)/org/[orgSlug]/(main)/settings/professionals/_components/create-professional-button'

interface ProfessionalsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProfessionalsPage = async ({ params }: ProfessionalsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas ADMIN, OWNER e SUPPORT acessam configuração de profissionais
  if (
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/crm/appointments`)
  }

  const [professionals, services, members] = await Promise.all([
    getProfessionals(ctx.orgId),
    getServices(ctx.orgId),
    getAcceptedMembersWithoutProfessional(ctx.orgId),
  ])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-muted-foreground">
            Gerencie os profissionais da sua equipe de atendimento.
          </p>
        </div>
        <CreateProfessionalButton services={services} members={members} />
      </div>

      <ProfessionalsDataTable professionals={professionals} orgSlug={orgSlug} />
    </div>
  )
}

export default ProfessionalsPage
