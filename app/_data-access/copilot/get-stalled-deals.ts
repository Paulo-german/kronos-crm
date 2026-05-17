import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { StalledDealDto, StalledDealsParams, StalledDealsResult } from './shared/insights-types'
import { makeInsightsCacheKey } from './shared/insights-cache'

const DAY_MS = 24 * 60 * 60 * 1000

const ORDER_BY_MAP: Record<
  StalledDealsParams['sort'],
  Prisma.DealOrderByWithRelationInput
> = {
  // Mais antigo primeiro = mais estagnado
  staleDesc: { updatedAt: 'asc' },
  valueDesc: { value: 'desc' },
}

const fetchStalledDealsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  params: StalledDealsParams,
): Promise<StalledDealsResult> => {
  const staleThreshold = new Date(Date.now() - params.staleAfterDays * DAY_MS)

  const where: Prisma.DealWhereInput = {
    organizationId: orgId,
    status: { in: ['OPEN', 'IN_PROGRESS'] },
    updatedAt: { lt: staleThreshold },
    ...(elevated ? {} : { assignedTo: userId }),
    ...(params.pipelineId ? { stage: { pipelineId: params.pipelineId } } : {}),
  }

  const [total, deals] = await Promise.all([
    db.deal.count({ where }),
    db.deal.findMany({
      where,
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            pipeline: { select: { id: true, name: true } },
          },
        },
        assignee: { select: { id: true, fullName: true } },
        contacts: {
          where: { isPrimary: true },
          take: 1,
          include: { contact: { select: { id: true, name: true } } },
        },
      },
      orderBy: ORDER_BY_MAP[params.sort],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  const now = Date.now()

  const data: StalledDealDto[] = deals.map((deal) => {
    const primary = deal.contacts[0]?.contact ?? null
    const daysSinceLastActivity = Math.floor((now - deal.updatedAt.getTime()) / DAY_MS)

    return {
      id: deal.id,
      title: deal.title,
      // Decimal vira number — value é Decimal não-null no schema, mas DTO mantém opcional para compat futura
      value: deal.value !== null ? Number(deal.value) : null,
      pipelineId: deal.stage.pipeline.id,
      pipelineName: deal.stage.pipeline.name,
      stageId: deal.stage.id,
      stageName: deal.stage.name,
      assignedTo: deal.assignedTo,
      assignedToName: deal.assignee?.fullName ?? null,
      primaryContactId: primary?.id ?? null,
      primaryContactName: primary?.name ?? null,
      daysSinceLastActivity,
    }
  })

  return { data, total }
}

export const getStalledDeals = async (
  ctx: RBACContext,
  params: StalledDealsParams,
): Promise<StalledDealsResult> => {
  const elevated = isElevated(ctx.userRole)

  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    staleAfterDays: params.staleAfterDays,
    pipelineId: params.pipelineId ?? '',
    sort: params.sort,
  })

  const getCached = unstable_cache(
    async () => fetchStalledDealsFromDb(ctx.orgId, ctx.userId, elevated, params),
    makeInsightsCacheKey('stalled-deals', ctx, paramsKey),
    {
      tags: [`copilot:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
