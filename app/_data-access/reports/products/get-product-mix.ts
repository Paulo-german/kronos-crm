import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CatalogItemType, DealStatus, DiscountType, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { getPreviousPeriod } from '@/_utils/date-range'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'

const CACHE_REVALIDATE_SECONDS = 3600
const PERCENTAGE_MAX = 100

export interface ProductMixRow {
  productId: string
  productName: string
  unitsSold: number
  revenue: number
  share: number
  prevUnitsSold: number
  prevRevenue: number
  prevShare: number
}

interface LineItemRow {
  productId: string | null
  quantity: number
  unitPrice: Prisma.Decimal
  discountType: DiscountType
  discountValue: Prisma.Decimal
  product: { id: string; name: string } | null
}

interface AggregateBucket {
  name: string
  unitsSold: number
  revenue: number
}

// Helper exportado para reuso pelo get-revenue-by-product (que precisa do updatedAt do deal).
export async function fetchProductLineItems(
  orgId: string,
  dealWhere: Prisma.DealWhereInput,
): Promise<LineItemRow[]> {
  return db.dealLineItem.findMany({
    where: {
      organizationId: orgId,
      itemType: CatalogItemType.PRODUCT,
      productId: { not: null },
      deal: dealWhere,
    },
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      discountType: true,
      discountValue: true,
      product: { select: { id: true, name: true } },
    },
  })
}

// Calcula a receita líquida de uma linha respeitando o tipo de desconto.
// Clamp em 0 para não permitir receita negativa (desconto fixo > base).
export function calcItemRevenue(item: {
  quantity: number
  unitPrice: Prisma.Decimal
  discountType: DiscountType
  discountValue: Prisma.Decimal
}): number {
  const base = item.quantity * Number(item.unitPrice)
  if (item.discountType === DiscountType.percentage) {
    return Math.max(0, base * (1 - Number(item.discountValue) / PERCENTAGE_MAX))
  }
  return Math.max(0, base - Number(item.discountValue))
}

function aggregateByProduct(items: LineItemRow[]): Map<string, AggregateBucket> {
  const buckets = new Map<string, AggregateBucket>()
  for (const item of items) {
    if (!item.productId || !item.product) continue
    const existing = buckets.get(item.productId)
    const revenue = calcItemRevenue(item)
    if (!existing) {
      buckets.set(item.productId, {
        name: item.product.name,
        unitsSold: item.quantity,
        revenue,
      })
      continue
    }
    existing.unitsSold += item.quantity
    existing.revenue += revenue
  }
  return buckets
}

async function fetchProductMix(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: ReportsFilters,
): Promise<ProductMixRow[]> {
  // Reports de produto focam em WON (deals fechados); ignoramos o status filter da UI.
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const currentDealWhere: Prisma.DealWhereInput = {
    ...baseWhere,
    status: DealStatus.WON,
    updatedAt: { gte: dateRange.start, lte: dateRange.end },
  }
  const prevDealWhere: Prisma.DealWhereInput = {
    ...baseWhere,
    status: DealStatus.WON,
    updatedAt: { gte: prevRange.start, lte: prevRange.end },
  }

  const [currentItems, prevItems] = await Promise.all([
    fetchProductLineItems(orgId, currentDealWhere),
    fetchProductLineItems(orgId, prevDealWhere),
  ])

  const currentBuckets = aggregateByProduct(currentItems)
  const prevBuckets = aggregateByProduct(prevItems)

  let currentTotal = 0
  for (const bucket of currentBuckets.values()) currentTotal += bucket.revenue
  let prevTotal = 0
  for (const bucket of prevBuckets.values()) prevTotal += bucket.revenue

  const productIds = new Set<string>([
    ...currentBuckets.keys(),
    ...prevBuckets.keys(),
  ])

  const rows: ProductMixRow[] = []
  for (const productId of productIds) {
    const current = currentBuckets.get(productId)
    const prev = prevBuckets.get(productId)
    const name = current?.name ?? prev?.name ?? ''
    const revenue = current?.revenue ?? 0
    const unitsSold = current?.unitsSold ?? 0
    const prevRevenue = prev?.revenue ?? 0
    const prevUnitsSold = prev?.unitsSold ?? 0
    const share = currentTotal > 0 ? (revenue / currentTotal) * PERCENTAGE_MAX : 0
    const prevShare = prevTotal > 0 ? (prevRevenue / prevTotal) * PERCENTAGE_MAX : 0

    rows.push({
      productId,
      productName: name,
      unitsSold,
      revenue,
      share,
      prevUnitsSold,
      prevRevenue,
      prevShare,
    })
  }

  rows.sort((left, right) => right.revenue - left.revenue)
  return rows
}

export const getProductMix = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<ProductMixRow[]> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () =>
        fetchProductMix(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          filters,
        ),
      makeReportsCacheKey('product-mix', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
