import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDashboardWhere } from './build-dashboard-where'
import type { DashboardFilters, DateRange, RevenueByMonth } from './types'

async function fetchRevenueOverTime(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: DashboardFilters,
): Promise<RevenueByMonth[]> {
  // Deals WON não são "inativos"; updatedAt é usado como dateRange, então ignora inactiveDays
  const baseWhere = buildDashboardWhere(orgId, userId, elevated, filters, {
    ignoreInactiveDays: true,
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

  // Gerar buckets mensais dinamicamente a partir do range
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

export const getRevenueOverTime = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: DashboardFilters,
  ): Promise<RevenueByMonth[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()
    const filtersKey = JSON.stringify({
      a: filters.assignee ?? '',
      s: filters.status ?? [],
      p: filters.priority ?? [],
      id: filters.inactiveDays ?? 0,
      pr: filters.productId ?? '',
      pi: filters.pipelineId ?? '',
    })

    const getCached = unstable_cache(
      async () =>
        fetchRevenueOverTime(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `dashboard-revenue-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`dashboard-charts:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
