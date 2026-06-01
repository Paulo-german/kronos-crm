import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProductMix } from '@/_data-access/reports/products/get-product-mix'
import { getTopProducts } from '@/_data-access/reports/products/get-top-products'
import { getRevenueByProduct } from '@/_data-access/reports/products/get-revenue-by-product'
import { parseReportsSearchParams } from '@/_data-access/reports/shared/reports-filters'
import { Card } from '@/_components/ui/card'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { ProductMixCard } from './_components/product-mix-card'
import { RevenueByProductCard } from './_components/revenue-by-product-card'
import { TopProductsTable } from './_components/top-products-table'

const TOP_PRODUCTS_LIMIT = 10

interface ProductsReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsReportPage({ params, searchParams }: ProductsReportPageProps) {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const { dateRange, filters } = parseReportsSearchParams(resolvedSearchParams)

  const [productMix, revenueByProduct, topProducts] = await Promise.all([
    getProductMix(ctx, dateRange, filters),
    getRevenueByProduct(ctx, dateRange, filters),
    getTopProducts(ctx, dateRange, filters, {
      metric: 'revenue',
      limit: TOP_PRODUCTS_LIMIT,
    }),
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

      {/* Bloco 2: Ranking dos produtos com maior receita no período */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Produtos mais vendidos</h2>
        <Card>
          <TopProductsTable data={topProducts} />
        </Card>
      </div>
    </div>
  )
}
