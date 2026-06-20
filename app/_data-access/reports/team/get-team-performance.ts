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
  dealsLostCount: number
  prevDealsLostCount: number
  openDealsCount: number
  openPipelineValue: number
}

interface WonAggregate {
  count: number
  revenue: number
}

interface OpenSnapshotAggregate {
  count: number
  value: number
}

// Convertemos os groupBy do Prisma em Maps por assignedTo para facilitar o join no app layer
// sem precisar de N findFirst por usuário.
function indexWonByAssignee(
  rows: Array<{
    assignedTo: string
    _count: { id: number }
    _sum: { value: unknown }
  }>,
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

// Indexa contagens simples (_count.id) por assignedTo — reusado para os
// agregados de "deals abertos no período" e "deals perdidos".
function indexCountByAssignee(
  rows: Array<{ assignedTo: string; _count: { id: number } }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.assignedTo, row._count.id)
  }
  return map
}

function indexOpenSnapshotByAssignee(
  rows: Array<{
    assignedTo: string
    _count: { id: number }
    _sum: { value: unknown }
  }>,
): Map<string, OpenSnapshotAggregate> {
  const map = new Map<string, OpenSnapshotAggregate>()
  for (const row of rows) {
    map.set(row.assignedTo, {
      count: row._count.id,
      value: Number(row._sum.value ?? 0),
    })
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

  const [
    wonCurrent,
    openedCurrent,
    wonPrev,
    openedPrev,
    lostCurrent,
    lostPrev,
    openSnapshot,
  ] = await Promise.all([
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
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      where: {
        ...baseWhere,
        status: DealStatus.LOST,
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      where: {
        ...baseWhere,
        status: DealStatus.LOST,
        updatedAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    // Pipeline ativo é snapshot ALL TIME (sem filtro temporal) — mesma convenção de
    // get-kpi-metrics-for-reports.ts. O valor não muda entre períodos para a mesma cache key.
    db.deal.groupBy({
      by: ['assignedTo'],
      _count: { id: true },
      _sum: { value: true },
      where: {
        ...baseWhere,
        status: { in: [DealStatus.OPEN, DealStatus.IN_PROGRESS] },
      },
    }),
  ])

  const wonCurrentMap = indexWonByAssignee(wonCurrent)
  const openedCurrentMap = indexCountByAssignee(openedCurrent)
  const wonPrevMap = indexWonByAssignee(wonPrev)
  const openedPrevMap = indexCountByAssignee(openedPrev)
  const lostCurrentMap = indexCountByAssignee(lostCurrent)
  const lostPrevMap = indexCountByAssignee(lostPrev)
  const openSnapshotMap = indexOpenSnapshotByAssignee(openSnapshot)

  // Vendedor pode ter pipeline ativo sem atividade no período (won/opened) — incluímos
  // openSnapshot.keys() para garantir que apareça no relatório.
  const activeUserIds = new Set<string>()
  for (const id of wonCurrentMap.keys()) activeUserIds.add(id)
  for (const id of openedCurrentMap.keys()) activeUserIds.add(id)
  for (const id of lostCurrentMap.keys()) activeUserIds.add(id)
  for (const id of openSnapshotMap.keys()) activeUserIds.add(id)

  if (activeUserIds.size === 0) return []

  // Buscamos apenas os usuários que serão exibidos (activeUserIds). Ids que só
  // aparecem no período anterior não entram no loop de `rows`, então não há
  // motivo para carregá-los.
  const users = await db.user.findMany({
    where: { id: { in: Array.from(activeUserIds) } },
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
    // LIMITAÇÃO CONHECIDA: conversão é uma aproximação. O numerador (won) conta
    // deals ganhos NO período (por updatedAt/fechamento), enquanto o denominador
    // (opened) conta deals criados NO período (por createdAt) — coortes distintas.
    // Sem um campo de data de fechamento, clampamos em 100% para evitar exibir
    // taxas absurdas (>100%) quando um vendedor fecha deals criados antes.
    const conversionRate =
      opened > 0 ? Math.min((won.count / opened) * 100, 100) : 0
    const prevAvgTicket =
      wonPast.count > 0 ? wonPast.revenue / wonPast.count : 0
    const prevConversionRate =
      openedPast > 0 ? Math.min((wonPast.count / openedPast) * 100, 100) : 0

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
      dealsLostCount: lostCurrentMap.get(assigneeId) ?? 0,
      prevDealsLostCount: lostPrevMap.get(assigneeId) ?? 0,
      openDealsCount: openSnapshotMap.get(assigneeId)?.count ?? 0,
      openPipelineValue: openSnapshotMap.get(assigneeId)?.value ?? 0,
    })
  }

  // Ordena por receita; desempata por deals ganhos e depois por nome para que
  // a posição/medalha seja determinística (evita ranking arbitrário em empates).
  rows.sort(
    (left, right) =>
      right.revenue - left.revenue ||
      right.dealsWonCount - left.dealsWonCount ||
      left.fullName.localeCompare(right.fullName),
  )
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
