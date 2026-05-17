import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { getPreviousPeriod } from '@/_utils/date-range'
import { buildReportsWhere } from '../shared/build-reports-where'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'

export interface PipelineVelocityDto {
  numDeals: number
  winRate: number
  avgTicket: number
  avgCycleDays: number
  velocity: number
  prevNumDeals: number
  prevWinRate: number
  prevAvgTicket: number
  prevAvgCycleDays: number
  prevVelocity: number
}

interface PeriodMetrics {
  numDeals: number
  winRate: number
  avgTicket: number
  avgCycleDays: number
  velocity: number
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MIN_CYCLE_DAYS = 1
const CACHE_REVALIDATE_SECONDS = 3600

async function computePeriodMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  range: DateRange,
  filters: ReportsFilters,
): Promise<PeriodMetrics> {
  // Para velocity precisamos enxergar deals em todos os status criados no período (OPEN/WON/LOST),
  // então ignoramos o filtro de status vindo da URL — caso contrário winRate ficaria viesado.
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const periodWhere = {
    ...baseWhere,
    createdAt: { gte: range.start, lte: range.end },
  }

  const [numDeals, wonDeals] = await Promise.all([
    db.deal.count({ where: periodWhere }),
    db.deal.findMany({
      where: { ...periodWhere, status: 'WON' },
      select: { value: true, createdAt: true, updatedAt: true },
    }),
  ])

  const wonCount = wonDeals.length
  const winRate = numDeals > 0 ? wonCount / numDeals : 0

  const ticketSum = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0)
  const avgTicket = wonCount > 0 ? ticketSum / wonCount : 0

  // Proxy de ciclo: updatedAt - createdAt do WON. Não há histórico de stages persistido.
  const cycleSumMs = wonDeals.reduce(
    (sum, deal) => sum + (deal.updatedAt.getTime() - deal.createdAt.getTime()),
    0,
  )
  const avgCycleMs = wonCount > 0 ? cycleSumMs / wonCount : 0
  const avgCycleDays = avgCycleMs / MILLISECONDS_PER_DAY

  const cycleDivisor = Math.max(avgCycleDays, MIN_CYCLE_DAYS)
  const velocity = (numDeals * winRate * avgTicket) / cycleDivisor

  return { numDeals, winRate, avgTicket, avgCycleDays, velocity }
}

async function fetchPipelineVelocity(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: ReportsFilters,
): Promise<PipelineVelocityDto> {
  const [current, previous] = await Promise.all([
    computePeriodMetrics(orgId, userId, elevated, dateRange, filters),
    computePeriodMetrics(orgId, userId, elevated, prevRange, filters),
  ])

  return {
    numDeals: current.numDeals,
    winRate: current.winRate,
    avgTicket: current.avgTicket,
    avgCycleDays: current.avgCycleDays,
    velocity: current.velocity,
    prevNumDeals: previous.numDeals,
    prevWinRate: previous.winRate,
    prevAvgTicket: previous.avgTicket,
    prevAvgCycleDays: previous.avgCycleDays,
    prevVelocity: previous.velocity,
  }
}

export const getPipelineVelocity = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters,
  ): Promise<PipelineVelocityDto> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () =>
        fetchPipelineVelocity(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          filters,
        ),
      makeReportsCacheKey('pipeline-velocity', ctx, dateRange, { ...filters }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
