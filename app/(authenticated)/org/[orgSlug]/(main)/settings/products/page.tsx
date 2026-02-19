import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProducts } from '@/_data-access/product/get-products'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { QuotaHint } from '@/_components/trial/quota-hint'

import { ProductsDataTable } from './_components/products-data-table'
import CreateProductButton from './_components/create-product-button'

interface ProductsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProductsPage = async ({ params }: ProductsPageProps) => {
  const { orgSlug } = await params
  const { orgId, userRole } = await getOrgContext(orgSlug)

  // RBAC: Apenas ADMIN e OWNER podem acessar produtos
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [products, quota] = await Promise.all([
    getProducts(orgId),
    checkPlanQuota(orgId, 'product'),
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
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seu catálogo de produtos.
            </p>
            <QuotaHint orgId={orgId} entity="product" />
          </div>
          <CreateProductButton withinQuota={quota.withinQuota} />
        </div>
        <ProductsDataTable products={products} />
      </div>
    </div>
  )
}

export default ProductsPage
