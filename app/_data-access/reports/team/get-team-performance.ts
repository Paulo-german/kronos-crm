import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { DealStatus } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { getPreviousPeriod } from '@/_utils/date-range'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'

const CACHE_REVALIDATE_SECONDS = 3600

export interface TeamMemberPerformance {
  userId: string
  fullName: string
  avatarUrl: string | null
  dealsWonCount: number
  revenue: number
  avgTicket: number
  conversionRate: number
  prevDealsWonCount: number
  prevRevenue: number
  prevAvgTicket: number
  prevConversionRate: number
}

interface WonAggregate {
  count: number
  revenue: number
}

// Convertemos os groupBy do Prisma em Maps por assignedTo para facilitar o join no app layer
// sem precisar de N findFirst por usuário.
function indexWonByAssignee(
  rows: Array<{ assignedTo: string; _count: { id: number }; _sum: { value: unknown } }>,
): Map<string, WonAggregate> {
  const map = new Map<string, WonAggregate>()
  for (const row of rows) {
    map.set(row.assignedTo, {
      count: row._count.id,
      revenue: Number(row._sum.value ?? 0),
    })
  }
  return map
}

function indexOpenedByAssignee(
  rows: Array<{ assignedTo: string; _count: { id: number } }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.assignedTo, row._count.id)
  }
  return map
}

async function fetchTeamPerformance(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: ReportsFilters,
): Promise<TeamMemberPerformance[]> {
  // Status fixo por agregação: WON usa updatedAt (data de fechamento), opened usa createdAt.
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const [wonCurrent, openedCurrent, wonPrev, openedPrev] = await Promise.all([
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      _sum: { value: true },
      where: {
        ...baseWhere,
        status: DealStatus.WON,
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      where: {
        ...baseWhere,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      _sum: { value: true },
      where: {
        ...baseWhere,
        status: DealStatus.WON,
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      where: {
        ...baseWhere,
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
  ])

  const wonCurrentMap = indexWonByAssignee(wonCurrent)
  const openedCurrentMap = indexOpenedByAssignee(openedCurrent)
  const wonPrevMap = indexWonByAssignee(wonPrev)
  const openedPrevMap = indexOpenedByAssignee(openedPrev)

  // Apenas usuários com atividade no período atual entram no relatório (won OU opened).
  const activeUserIds = new Set<string>()
  for (const id of wonCurrentMap.keys()) activeUserIds.add(id)
  for (const id of openedCurrentMap.keys()) activeUserIds.add(id)

  // Coletamos todos os ids (atual + anterior) só para popular o userMap em um único findMany.
  const allUserIds = new Set<string>(activeUserIds)
  for (const id of wonPrevMap.keys()) allUserIds.add(id)
  for (const id of openedPrevMap.keys()) allUserIds.add(id)

  if (activeUserIds.size === 0) return []

  const users = await db.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, fullName: true, avatarUrl: true },
  })

  const userMap = new Map(users.map((user) => [user.id, user]))

  const rows: TeamMemberPerformance[] = []
  for (const assigneeId of activeUserIds) {
    const user = userMap.get(assigneeId)
    const won = wonCurrentMap.get(assigneeId) ?? { count: 0, revenue: 0 }
    const opened = openedCurrentMap.get(assigneeId) ?? 0
    const wonPast = wonPrevMap.get(assigneeId) ?? { count: 0, revenue: 0 }
    const openedPast = openedPrevMap.get(assigneeId) ?? 0

    const avgTicket = won.count > 0 ? won.revenue / won.count : 0
    const conversionRate = opened > 0 ? (won.count / opened) * 100 : 0
    const prevAvgTicket = wonPast.count > 0 ? wonPast.revenue / wonPast.count : 0
    const prevConversionRate = openedPast > 0 ? (wonPast.count / openedPast) * 100 : 0

    rows.push({
      userId: assigneeId,
      fullName: user?.fullName ?? '',
      avatarUrl: user?.avatarUrl ?? null,
      dealsWonCount: won.count,
      revenue: won.revenue,
      avgTicket,
      conversionRate,
      prevDealsWonCount: wonPast.count,
      prevRevenue: wonPast.revenue,
      prevAvgTicket,
      prevConversionRate,
    })
  }

  rows.sort((left, right) => right.revenue - left.revenue)
  return rows
}

export const getTeamPerformance = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<TeamMemberPerformance[]> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () =>
        fetchTeamPerformance(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          filters,
        ),
      makeReportsCacheKey('team-performance', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
