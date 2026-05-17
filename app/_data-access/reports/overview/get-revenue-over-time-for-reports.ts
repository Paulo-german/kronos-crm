import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'
import type { RevenueByMonth } from '@/_data-access/dashboard/types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { RevenueByMonth } from '@/_data-access/dashboard/types'

async function fetchRevenueOverTimeForReports(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: ReportsFilters,
): Promise<RevenueByMonth[]> {
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const deals = await db.deal.findMany({
    where: {
      ...baseWhere,
      status: 'WON',
      updatedAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: { value: true, updatedAt: true },
  })

  const grouped = new Map<string, { revenue: number; count: number }>()

  // Gera buckets mensais dinamicamente; meses sem WON aparecem zerados para preservar o eixo temporal
  const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end })
  for (const month of months) {
    const key = format(month, 'yyyy-MM')
    grouped.set(key, { revenue: 0, count: 0 })
  }

  for (const deal of deals) {
    const key = format(deal.updatedAt, 'yyyy-MM')
    const entry = grouped.get(key)
    if (entry) {
      entry.revenue += Number(deal.value)
      entry.count += 1
    }
  }

  return Array.from(grouped.entries()).map(([month, data]) => {
    const date = new Date(`${month}-01`)
    return {
      month,
      label: format(date, 'MMM', { locale: ptBR }),
      revenue: data.revenue,
      count: data.count,
    }
  })
}

export const getRevenueOverTimeForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<RevenueByMonth[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchRevenueOverTimeForReports(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          filters,
        ),
      makeReportsCacheKey('revenue', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
