import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { getServices } from '@/_data-access/service/get-services'
import { Button } from '@/_components/ui/button'

import { ProfessionalsDataTable } from './_components/professionals-data-table'
import CreateProfessionalButton from './_components/create-professional-button'

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

  const [professionals, services] = await Promise.all([
    getProfessionals(ctx.orgId),
    getServices(ctx.orgId),
  ])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-muted-foreground">
            Gerencie os profissionais da sua equipe de atendimento.
          </p>
        </div>
        <CreateProfessionalButton services={services} />
      </div>

      <ProfessionalsDataTable professionals={professionals} orgSlug={orgSlug} />
    </div>
  )
}

export default ProfessionalsPage
