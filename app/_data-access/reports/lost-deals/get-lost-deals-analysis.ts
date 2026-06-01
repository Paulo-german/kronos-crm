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

const CACHE_REVALIDATE_SECONDS = 3600

// Bucket usado para deals que perderam sem motivo cadastrado — UI mostra como "Sem motivo"
const UNKNOWN_REASON_BUCKET = 'unknown'
const UNKNOWN_REASON_LABEL = 'Sem motivo'

export interface LostDealsByStage {
  stageId: string
  stageName: string
  position: number
  count: number
  value: number
  prevCount: number
  prevValue: number
}

export interface LostDealsByReason {
  reasonId: string
  reasonLabel: string
  count: number
  value: number
  prevCount: number
  prevValue: number
}

export interface LostDealsAnalysisDto {
  byStage: LostDealsByStage[]
  byReason: LostDealsByReason[]
  totalLost: number
  totalLostValue: number
  prevTotalLost: number
  prevTotalLostValue: number
}

interface LostDealAggregateRow {
  pipelineStageId: string
  lossReasonId: string | null
  value: number
}

/**
 * Carrega os deals perdidos do período usando `updatedAt` como proxy de data de perda
 * (não temos histórico de stages — `DealStageHistory` não existe). Retorna os campos
 * mínimos para agregação posterior em memória, evitando dois `groupBy` que perderiam
 * o JOIN para o nome do motivo/estágio.
 */
async function fetchLostDealsInRange(
  orgId: string,
  userId: string,
  elevated: boolean,
  filters: ReportsFilters,
  dateRange: DateRange,
): Promise<LostDealAggregateRow[]> {
  // Ignora o filtro de status (vamos fixar LOST) para não criar conflito com o filtro de UI
  const baseWhere = buildReportsWhere(orgId, userId, elevated, filters, {
    ignoreStatus: true,
  })

  const deals = await db.deal.findMany({
    where: {
      ...baseWhere,
      status: 'LOST',
      updatedAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      pipelineStageId: true,
      lossReasonId: true,
      value: true,
    },
  })

  return deals.map((deal) => ({
    pipelineStageId: deal.pipelineStageId,
    lossReasonId: deal.lossReasonId,
    value: Number(deal.value),
  }))
}

async function fetchStageMetadata(
  stageIds: string[],
): Promise<Map<string, { name: string; position: number }>> {
  if (stageIds.length === 0) return new Map()

  const stages = await db.pipelineStage.findMany({
    where: { id: { in: stageIds } },
    select: { id: true, name: true, position: true },
  })

  return new Map(stages.map((stage) => [stage.id, { name: stage.name, position: stage.position }]))
}

async function fetchReasonMetadata(
  reasonIds: string[],
): Promise<Map<string, string>> {
  if (reasonIds.length === 0) return new Map()

  const reasons = await db.dealLostReason.findMany({
    where: { id: { in: reasonIds } },
    select: { id: true, name: true },
  })

  return new Map(reasons.map((reason) => [reason.id, reason.name]))
}

function aggregateByStage(
  current: LostDealAggregateRow[],
  previous: LostDealAggregateRow[],
  stageMeta: Map<string, { name: string; position: number }>,
): LostDealsByStage[] {
  const map = new Map<string, LostDealsByStage>()

  const ensure = (stageId: string): LostDealsByStage => {
    const existing = map.get(stageId)
    if (existing) return existing
    const meta = stageMeta.get(stageId)
    const created: LostDealsByStage = {
      stageId,
      stageName: meta?.name ?? 'Etapa removida',
      position: meta?.position ?? Number.MAX_SAFE_INTEGER,
      count: 0,
      value: 0,
      prevCount: 0,
      prevValue: 0,
    }
    map.set(stageId, created)
    return created
  }

  for (const row of current) {
    const entry = ensure(row.pipelineStageId)
    entry.count += 1
    entry.value += row.value
  }

  for (const row of previous) {
    const entry = ensure(row.pipelineStageId)
    entry.prevCount += 1
    entry.prevValue += row.value
  }

  return Array.from(map.values()).sort((first, second) => first.position - second.position)
}

function aggregateByReason(
  current: LostDealAggregateRow[],
  previous: LostDealAggregateRow[],
  reasonMeta: Map<string, string>,
): LostDealsByReason[] {
  const map = new Map<string, LostDealsByReason>()

  const ensure = (reasonId: string | null): LostDealsByReason => {
    // Resolve o label antes da chave: motivos null OU deletados (ausentes em reasonMeta)
    // caem todos no mesmo bucket "unknown", evitando entradas "Sem motivo" duplicadas com UUIDs órfãos.
    const resolvedLabel = reasonId ? reasonMeta.get(reasonId) : undefined
    const key = reasonId && resolvedLabel ? reasonId : UNKNOWN_REASON_BUCKET
    const existing = map.get(key)
    if (existing) return existing
    const created: LostDealsByReason = {
      reasonId: key,
      reasonLabel: resolvedLabel ?? UNKNOWN_REASON_LABEL,
      count: 0,
      value: 0,
      prevCount: 0,
      prevValue: 0,
    }
    map.set(key, created)
    return created
  }

  for (const row of current) {
    const entry = ensure(row.lossReasonId)
    entry.count += 1
    entry.value += row.value
  }

  for (const row of previous) {
    const entry = ensure(row.lossReasonId)
    entry.prevCount += 1
    entry.prevValue += row.value
  }

  // Ordena pela maior quantidade de perdas no período atual (mais relevante para o usuário)
  return Array.from(map.values()).sort((first, second) => second.count - first.count)
}

async function fetchLostDealsAnalysis(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  filters: ReportsFilters,
): Promise<LostDealsAnalysisDto> {
  const [currentRows, previousRows] = await Promise.all([
    fetchLostDealsInRange(orgId, userId, elevated, filters, dateRange),
    fetchLostDealsInRange(orgId, userId, elevated, filters, prevRange),
  ])

  const stageIds = Array.from(
    new Set<string>([
      ...currentRows.map((row) => row.pipelineStageId),
      ...previousRows.map((row) => row.pipelineStageId),
    ]),
  )

  const reasonIds = Array.from(
    new Set<string>(
      [...currentRows, ...previousRows]
        .map((row) => row.lossReasonId)
        .filter((value): value is string => value !== null),
    ),
  )

  const [stageMeta, reasonMeta] = await Promise.all([
    fetchStageMetadata(stageIds),
    fetchReasonMetadata(reasonIds),
  ])

  const byStage = aggregateByStage(currentRows, previousRows, stageMeta)
  const byReason = aggregateByReason(currentRows, previousRows, reasonMeta)

  const totalLost = currentRows.length
  const totalLostValue = currentRows.reduce((sum, row) => sum + row.value, 0)
  const prevTotalLost = previousRows.length
  const prevTotalLostValue = previousRows.reduce((sum, row) => sum + row.value, 0)

  return {
    byStage,
    byReason,
    totalLost,
    totalLostValue,
    prevTotalLost,
    prevTotalLostValue,
  }
}

export const getLostDealsAnalysis = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: { pipelineId?: string; assignee?: string },
  ): Promise<LostDealsAnalysisDto> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    // Repassa pipelineId e assignee — o assignee é honrado pelo buildReportsWhere apenas para usuários elevados
    const reportsFilters: ReportsFilters = {
      ...(filters.pipelineId && { pipelineId: filters.pipelineId }),
      ...(filters.assignee && { assignee: filters.assignee }),
    }

    const getCached = unstable_cache(
      async () =>
        fetchLostDealsAnalysis(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          reportsFilters,
        ),
      makeReportsCacheKey('lost-deals', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
