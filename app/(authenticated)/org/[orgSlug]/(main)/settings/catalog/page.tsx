import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProducts } from '@/_data-access/product/get-products'
import { getServicesPaginated } from '@/_data-access/service/get-services-paginated'
import { getServiceCategories } from '@/_data-access/service/get-service-categories'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { getPromotions } from '@/_data-access/promotion/get-promotions'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { QuotaHint } from '@/_components/trial/quota-hint'

import { CatalogTabs } from './_components/catalog-tabs'

interface CatalogPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const CatalogPage = async ({ params, searchParams }: CatalogPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas ADMIN, OWNER e SUPPORT acessam o catálogo
  if (
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/settings`)
  }

  // Parâmetros de paginação de serviços com defaults
  const rawPage = resolvedSearchParams['page']
  const rawSearch = resolvedSearchParams['search']
  const rawCategoryId = resolvedSearchParams['categoryId']
  const rawStatus = resolvedSearchParams['status']

  const serviceParams = {
    page: typeof rawPage === 'string' ? Math.max(1, parseInt(rawPage, 10) || 1) : 1,
    pageSize: 20,
    search: typeof rawSearch === 'string' ? rawSearch : '',
    categoryId: typeof rawCategoryId === 'string' ? rawCategoryId : undefined,
    status: (
      rawStatus === 'active' || rawStatus === 'inactive' ? rawStatus : 'all'
    ) as 'all' | 'active' | 'inactive',
  }

  const [products, servicesResult, categories, professionals, promotions, productQuota] =
    await Promise.all([
      getProducts(ctx.orgId),
      getServicesPaginated(ctx.orgId, serviceParams),
      getServiceCategories(ctx.orgId),
      getProfessionals(ctx.orgId),
      getPromotions(ctx.orgId),
      checkPlanQuota(ctx.orgId, 'product'),
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catálogo</h1>
            <p className="text-muted-foreground">
              Gerencie seus produtos, serviços e promoções.
            </p>
          </div>
        </div>
        <QuotaHint orgId={ctx.orgId} entity="product" />
      </div>

      <CatalogTabs
        products={products}
        services={servicesResult.data}
        servicesPage={servicesResult.page}
        servicesPageSize={servicesResult.pageSize}
        servicesTotal={servicesResult.total}
        servicesTotalPages={servicesResult.totalPages}
        categories={categories}
        professionals={professionals}
        promotions={promotions}
        productQuota={productQuota.withinQuota}
      />
    </div>
  )
}

export default CatalogPage
