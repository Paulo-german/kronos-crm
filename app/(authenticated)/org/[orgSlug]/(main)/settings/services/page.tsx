import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getServices } from '@/_data-access/service/get-services'
import { getServiceCategories } from '@/_data-access/service/get-service-categories'
import { Button } from '@/_components/ui/button'

import { ServicesDataTable } from './_components/services-data-table'
import CreateServiceButton from './_components/create-service-button'
import ManageCategoriesSheet from './_components/manage-categories-sheet'

interface ServicesPageProps {
  params: Promise<{ orgSlug: string }>
}

const ServicesPage = async ({ params }: ServicesPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas ADMIN, OWNER e SUPPORT acessam configuração de serviços
  if (
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/crm/appointments`)
  }

  const [services, categories] = await Promise.all([
    getServices(ctx.orgId, true), // incluir inativos na tela de configuração
    getServiceCategories(ctx.orgId),
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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Serviços</h1>
            <p className="text-muted-foreground">
              Gerencie os serviços oferecidos pela sua equipe.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ManageCategoriesSheet categories={categories} />
            <CreateServiceButton categories={categories} />
          </div>
        </div>

        <ServicesDataTable services={services} categories={categories} />
      </div>
    </div>
  )
}

export default ServicesPage
