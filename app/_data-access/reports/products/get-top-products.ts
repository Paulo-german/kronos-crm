import 'server-only'

import { getProductMix } from './get-product-mix'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange, ReportsFilters } from '../shared/reports-types'
import type { ProductMixRow } from './get-product-mix'

export type { ProductMixRow } from './get-product-mix'

interface TopProductsOptions {
  metric: 'revenue' | 'units'
  limit: number
}

// Wrapper puro: reusa o cache de getProductMix e apenas reordena/trunca no app layer.
// Sem cache próprio porque a operação é O(n log n) sobre o dataset já cacheado.
export async function getTopProducts(
  ctx: RBACContext,
  dateRange: DateRange,
  filters: ReportsFilters,
  options: TopProductsOptions,
): Promise<ProductMixRow[]> {
  const rows = await getProductMix(ctx, dateRange, filters)
  const sorted = [...rows].sort((left, right) =>
    options.metric === 'revenue'
      ? right.revenue - left.revenue
      : right.unitsSold - left.unitsSold,
  )
  return sorted.slice(0, options.limit)
}
