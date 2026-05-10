import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getServicesPaginated } from '@/_data-access/service/get-services-paginated'
import { getServiceCategories } from '@/_data-access/service/get-service-categories'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { Button } from '@/_components/ui/button'
import { parseServiceListParams } from './_lib/service-list-params'

import { ServicesListClient } from './_components/services-list-client'

interface ServicesPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const ServicesPage = async ({ params, searchParams }: ServicesPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas ADMIN, OWNER e SUPPORT acessam configuração de serviços
  if (
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/crm/appointments`)
  }

  const listParams = parseServiceListParams(resolvedSearchParams)

  const [result, categories, professionals] = await Promise.all([
    getServicesPaginated(ctx.orgId, listParams),
    getServiceCategories(ctx.orgId),
    getProfessionals(ctx.orgId),
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
        <ServicesListClient
          services={result.data}
          categories={categories}
          professionals={professionals}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          totalPages={result.totalPages}
        />
      </div>
    </div>
  )
}

export default ServicesPage
