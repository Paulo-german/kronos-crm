import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProductsPaginated } from '@/_data-access/product/get-products-paginated'
import { getServicesPaginated } from '@/_data-access/service/get-services-paginated'
import { getPromotionsPaginated } from '@/_data-access/promotion/get-promotions-paginated'
import { getServiceCategories } from '@/_data-access/service/get-service-categories'
import { getProfessionals } from '@/_data-access/professional/get-professionals'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { QuotaHint } from '@/_components/trial/quota-hint'

import { parseProductListParams } from './_lib/product-list-params'
import { parsePromotionListParams } from './_lib/promotion-list-params'
import { CatalogTabs } from './_components/catalog-tabs'

interface CatalogPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const CatalogPage = async ({ params, searchParams }: CatalogPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)

  if (
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/settings`)
  }

  // Parâmetros de serviços (sem prefixo — legado)
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

  const productParams = parseProductListParams(resolvedSearchParams)
  const promotionParams = parsePromotionListParams(resolvedSearchParams)

  const [productsResult, servicesResult, promotionsResult, categories, professionals, productQuota] =
    await Promise.all([
      getProductsPaginated(ctx.orgId, productParams),
      getServicesPaginated(ctx.orgId, serviceParams),
      getPromotionsPaginated(ctx.orgId, promotionParams),
      getServiceCategories(ctx.orgId),
      getProfessionals(ctx.orgId),
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
        products={productsResult.data}
        productsPage={productsResult.page}
        productsPageSize={productsResult.pageSize}
        productsTotal={productsResult.total}
        productsTotalPages={productsResult.totalPages}
        services={servicesResult.data}
        servicesPage={servicesResult.page}
        servicesPageSize={servicesResult.pageSize}
        servicesTotal={servicesResult.total}
        servicesTotalPages={servicesResult.totalPages}
        categories={categories}
        professionals={professionals}
        promotions={promotionsResult.data}
        promotionsPage={promotionsResult.page}
        promotionsPageSize={promotionsResult.pageSize}
        promotionsTotal={promotionsResult.total}
        promotionsTotalPages={promotionsResult.totalPages}
        productQuota={productQuota.withinQuota}
      />
    </div>
  )
}

export default CatalogPage
