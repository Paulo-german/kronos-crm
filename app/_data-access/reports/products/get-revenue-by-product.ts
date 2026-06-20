import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { DealStatus, Prisma } from '@prisma/client'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import { calcItemRevenue, fetchProductLineItems } from './get-product-mix'
import type { DateRange, ReportsFilters } from '../shared/reports-types'

const CACHE_REVALIDATE_SECONDS = 3600
const MONTH_ISO_LENGTH = 7

// Labels em PT-BR; usamos abreviação para o eixo X dos charts.
const MONTH_LABELS_PTBR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

export interface RevenueByProductPoint {
  monthIso: string
  month: string
  products: Array<{ productId: string; productName: string; revenue: number }>
}

interface MonthBucket {
  // productId → { name, revenue }
  byProduct: Map<string, { name: string; revenue: number }>
}

function monthLabel(monthIso: string): string {
  // monthIso é "YYYY-MM"; extraímos o índice 0-11 do label.
  const monthNumber = Number(monthIso.slice(5, 7))
  return MONTH_LABELS_PTBR[monthNumber - 1] ?? ''
}

async function fetchRevenueByProduct(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: ReportsFilters,
): Promise<RevenueByProductPoint[]> {
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const dealWhere: Prisma.DealWhereInput = {
    ...baseWhere,
    status: DealStatus.WON,
    updatedAt: { gte: dateRange.start, lte: dateRange.end },
  }

  // Reusa o fetch compartilhado com get-product-mix. O select já inclui deal.updatedAt,
  // que precisamos porque o agrupamento por mês acontece no app layer (Prisma não tem
  // groupBy por expressão derivada como date_trunc; pagamos custo de memória vs. $queryRaw).
  const items = await fetchProductLineItems(orgId, dealWhere)

  const months = new Map<string, MonthBucket>()
  for (const item of items) {
    if (!item.productId || !item.product) continue
    const monthIso = item.deal.updatedAt
      .toISOString()
      .slice(0, MONTH_ISO_LENGTH)
    let bucket = months.get(monthIso)
    if (!bucket) {
      bucket = { byProduct: new Map() }
      months.set(monthIso, bucket)
    }
    const revenue = calcItemRevenue(item)
    const existing = bucket.byProduct.get(item.productId)
    if (!existing) {
      bucket.byProduct.set(item.productId, {
        name: item.product.name,
        revenue,
      })
      continue
    }
    existing.revenue += revenue
  }

  const points: RevenueByProductPoint[] = []
  for (const [monthIso, bucket] of months) {
    const products: RevenueByProductPoint['products'] = []
    for (const [productId, info] of bucket.byProduct) {
      products.push({
        productId,
        productName: info.name,
        revenue: info.revenue,
      })
    }
    points.push({ monthIso, month: monthLabel(monthIso), products })
  }

  points.sort((left, right) => (left.monthIso < right.monthIso ? -1 : 1))
  return points
}

export const getRevenueByProduct = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<RevenueByProductPoint[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchRevenueByProduct(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          filters,
        ),
      makeReportsCacheKey('revenue-by-product', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
