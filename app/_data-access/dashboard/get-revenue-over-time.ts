import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { format, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DateRange, RevenueByMonth } from './types'

async function fetchRevenueOverTime(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  pipelineId?: string,
): Promise<RevenueByMonth[]> {
  const deals = await db.deal.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
      ...(pipelineId ? { stage: { pipelineId } } : {}),
      status: 'WON',
      updatedAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: { value: true, updatedAt: true },
  })

  const grouped = new Map<string, { revenue: number; count: number }>()

  // Gerar buckets mensais dinamicamente a partir do range
  const months = eachMonthOfInterval({
    start: dateRange.start,
    end: dateRange.end,
  })
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
    pipelineId?: string,
  ): Promise<RevenueByMonth[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()

    const getCached = unstable_cache(
      async () =>
        fetchRevenueOverTime(ctx.orgId, ctx.userId, elevated, dateRange, pipelineId),
      [
        `dashboard-revenue-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${pipelineId ?? 'all'}`,
      ],
      {
        tags: [`dashboard-charts:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
