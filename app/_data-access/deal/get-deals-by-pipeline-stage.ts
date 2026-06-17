import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildDealWhereClause } from './build-deal-where-clause'
import {
  dealKanbanInclude,
  mapDealToDto,
  type DealDto,
} from './get-deals-by-pipeline'
import {
  buildDealOrderBy,
  type DealSort,
  type PipelineDealFilterInput,
} from './pipeline-deals-params'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface PipelineStageDealsResult {
  deals: DealDto[]
  hasMore: boolean
  nextCursor: string | null
}

interface GetStageDealsOptions {
  sort: DealSort
  filters: PipelineDealFilterInput
  cursor?: string
  limit?: number
}

const fetchStageDealsFromDb = async (
  stageId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
  options: GetStageDealsOptions,
): Promise<PipelineStageDealsResult> => {
  const { sort, filters, cursor } = options
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

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
  })

  // Assignee multi-select é composto aqui (o builder compartilhado só aceita um) e
  // só para elevados — MEMBER já é travado no próprio id pelo builder.
  const assigneeWhere: Prisma.DealWhereInput =
    elevated && filters.assignee && filters.assignee.length > 0
      ? { assignedTo: { in: filters.assignee } }
      : {}

  const where: Prisma.DealWhereInput = {
    ...baseWhere,
    ...assigneeWhere,
    pipelineStageId: stageId,
  }

  const deals = await db.deal.findMany({
    where,
    include: dealKanbanInclude,
    orderBy: buildDealOrderBy(sort),
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = deals.length > limit
  const sliced = hasMore ? deals.slice(0, limit) : deals
  const mapped = sliced.map(mapDealToDto)

  return {
    deals: mapped,
    hasMore,
    nextCursor: hasMore ? (sliced.at(-1)?.id ?? null) : null,
  }
}

/**
 * Paginação por cursor dos deals de UM estágio do pipeline (uma coluna do Kanban).
 *
 * Reusa buildDealWhereClause (RBAC + filtros) e fixa pipelineStageId. Cacheado com
 * cache() + unstable_cache() (tag deals:${orgId}) seguindo o padrão do projeto, de
 * modo que o revalidateTag das actions invalide também esta leitura no servidor.
 */
export const getDealsByPipelineStage = async (
  stageId: string,
  ctx: RBACContext,
  options: GetStageDealsOptions,
): Promise<PipelineStageDealsResult> => {
  const elevated = isElevated(ctx.userRole)
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const cacheKey = JSON.stringify({
    sort: options.sort,
    filters: options.filters,
    cursor: options.cursor ?? 'none',
    limit,
  })

  const getCached = cache(async () => {
    const getFromCache = unstable_cache(
      async () =>
        fetchStageDealsFromDb(
          stageId,
          ctx.orgId,
          ctx.userId,
          elevated,
          options,
        ),
      [
        `deals-stage-${ctx.orgId}-${ctx.userId}-${elevated}-${stageId}-${cacheKey}`,
      ],
      { tags: [`deals:${ctx.orgId}`], revalidate: 3600 },
    )
    return getFromCache()
  })

  return getCached()
}
