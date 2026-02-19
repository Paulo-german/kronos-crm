import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { subMonths, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { RevenueByMonth } from './types'

async function fetchRevenueOverTime(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<RevenueByMonth[]> {
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))

  const deals = await db.deal.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
      status: 'WON',
      updatedAt: { gte: sixMonthsAgo },
    },
    select: { value: true, updatedAt: true },
  })

  const grouped = new Map<string, { revenue: number; count: number }>()

  // Inicializa os últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    const key = format(date, 'yyyy-MM')
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
  async (ctx: RBACContext): Promise<RevenueByMonth[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () => fetchRevenueOverTime(ctx.orgId, ctx.userId, elevated),
      [`dashboard-revenue-${ctx.orgId}-${ctx.userId}-${elevated}`],
      {
        tags: [`dashboard-charts:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: 7200,
      },
    )

    return getCached()
  },
)
