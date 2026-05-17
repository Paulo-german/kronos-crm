import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { getProductMix } from '@/_data-access/reports/products/get-product-mix'
import { getRevenueByProduct } from '@/_data-access/reports/products/get-revenue-by-product'
import { Card } from '@/_components/ui/card'
import type { ReportsFilters } from '@/_data-access/reports/shared/reports-types'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { ProductMixCard } from './_components/product-mix-card'
import { RevenueByProductCard } from './_components/revenue-by-product-card'
import { TopProductsTable } from './_components/top-products-table'

interface ProductsReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string; assignee?: string }>
}

export default async function ProductsReportPage({ params, searchParams }: ProductsReportPageProps) {
  const { orgSlug } = await params
  const { start, end, assignee } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const filters: ReportsFilters = { assignee }

  const [productMix, revenueByProduct] = await Promise.all([
    getProductMix(ctx, dateRange, filters),
    getRevenueByProduct(ctx, dateRange, filters),
  ])

  const section = findReportSection('products')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Produtos'}
        description={section?.description}
      />

      {/* Bloco 1: Mix de produtos e receita lado a lado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductMixCard data={productMix} />
        <RevenueByProductCard data={revenueByProduct} />
      </div>

      {/* Bloco 2: Tabela completa */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Todos os produtos</h2>
        <Card>
          <TopProductsTable data={productMix} />
        </Card>
      </div>
    </div>
  )
}
