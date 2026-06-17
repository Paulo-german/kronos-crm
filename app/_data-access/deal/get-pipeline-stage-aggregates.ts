import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDealWhereClause } from './build-deal-where-clause'
import type { PipelineDealFilterInput } from './pipeline-deals-params'

export interface StageAggregate {
  count: number
  totalValue: number
}

export type PipelineStageAggregates = Record<string, StageAggregate>

const fetchStageAggregatesFromDb = async (
  pipelineId: string,
  stageIds: string[],
  orgId: string,
  userId: string,
  elevated: boolean,
  filters: PipelineDealFilterInput,
): Promise<PipelineStageAggregates> => {
  const result: PipelineStageAggregates = stageIds.reduce((acc, stageId) => {
    acc[stageId] = { count: 0, totalValue: 0 }
    return acc
  }, {} as PipelineStageAggregates)

  const baseWhere = buildDealWhereClause({
    orgId,
    userId,
    elevated,
    status: filters.status,
    priority: filters.priority,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
    pipelineId,
  })

  const assigneeWhere: Prisma.DealWhereInput =
    elevated && filters.assignee && filters.assignee.length > 0
      ? { assignedTo: { in: filters.assignee } }
      : {}

  const groups = await db.deal.groupBy({
    by: ['pipelineStageId'],
    where: { ...baseWhere, ...assigneeWhere },
    _count: { _all: true },
    _sum: { value: true },
  })

  for (const group of groups) {
    if (result[group.pipelineStageId]) {
      result[group.pipelineStageId] = {
        count: group._count._all,
        totalValue: Number(group._sum.value ?? 0),
      }
    }
  }

  return result
}

/**
 * Agregados (contagem + soma de valor) por estágio de um pipeline, respeitando os
 * mesmos filtros da listagem. Alimenta os headers das colunas — sempre refletindo
 * o total real, independente do que foi paginado.
 *
 * Reusa o padrão de groupBy do funnel report e o cache do projeto (cache() +
 * unstable_cache, tag deals:${orgId}). O valor somado é deal.value (campo base),
 * coerente com o filtro de valor de buildDealWhereClause.
 */
export const getPipelineStageAggregates = async (
  pipelineId: string,
  stageIds: string[],
  ctx: RBACContext,
  filters: PipelineDealFilterInput,
): Promise<PipelineStageAggregates> => {
  if (stageIds.length === 0) return {}

  const elevated = isElevated(ctx.userRole)
  const sortedStageIds = [...stageIds].sort()
  const cacheKey = JSON.stringify({ stageIds: sortedStageIds, filters })

  const getCached = cache(async () => {
    const getFromCache = unstable_cache(
      async () =>
        fetchStageAggregatesFromDb(
          pipelineId,
          stageIds,
          ctx.orgId,
          ctx.userId,
          elevated,
          filters,
        ),
      [
        `deals-aggregates-${ctx.orgId}-${ctx.userId}-${elevated}-${pipelineId}-${cacheKey}`,
      ],
      { tags: [`deals:${ctx.orgId}`], revalidate: 3600 },
    )
    return getFromCache()
  })

  return getCached()
}
