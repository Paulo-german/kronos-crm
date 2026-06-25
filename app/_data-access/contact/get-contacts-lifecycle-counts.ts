import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma, LifecycleStage } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { ContactListParams } from './get-contacts'
import { buildContactFilterWhere } from './build-contact-filter-where'

export interface ContactsLifecycleCounts extends Record<
  LifecycleStage,
  number
> {
  total: number
}

const fetchCountsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
  params: ContactListParams,
): Promise<ContactsLifecycleCounts> => {
  const masked = !elevated && hidePiiFromMembers

  // WHERE igual ao da listagem paginada, mas sem filtro de lifecycleStage
  // para que cada tab mostre o total de contatos que cairiam nela
  const where: Prisma.ContactWhereInput = {
    organizationId: orgId,
    ...(elevated ? {} : { assignedTo: userId }),
    ...(elevated && params.assignedTo ? { assignedTo: params.assignedTo } : {}),
    // Filtros nativos compartilhados, exceto lifecycleStages (a contagem
    // ignora esse filtro de propósito — cada tab conta o próprio estágio)
    ...buildContactFilterWhere({ ...params, lifecycleStages: undefined }),
    ...(params.search.trim()
      ? {
          OR: [
            {
              name: {
                contains: params.search.trim(),
                mode: 'insensitive' as const,
              },
            },
            ...(!masked
              ? [
                  {
                    email: {
                      contains: params.search.trim(),
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    phone: {
                      contains: params.search.trim(),
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  }

  const rows = await db.contact.groupBy({
    by: ['lifecycleStage'],
    where,
    _count: { _all: true },
  })

  const defaults: Record<LifecycleStage, number> = {
    COLD: 0,
    LEAD: 0,
    QUALIFIED: 0,
    OPPORTUNITY: 0,
    CUSTOMER: 0,
  }

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.lifecycleStage] = row._count._all
      return acc
    },
    defaults as Record<LifecycleStage, number>,
  )

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return { ...counts, total } as ContactsLifecycleCounts
}

export const getContactsLifecycleCounts = cache(
  async (
    ctx: RBACContext,
    params: ContactListParams,
  ): Promise<ContactsLifecycleCounts> => {
    const elevated = isElevated(ctx.userRole)
    const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

    // Cache key exclui lifecycleStages pois a contagem ignora esse filtro
    const paramsKey = JSON.stringify({
      search: params.search,
      companyId: params.companyId ?? '',
      isDecisionMaker: params.isDecisionMaker ?? '',
      hasDeals: params.hasDeals ?? '',
      assignedTo: params.assignedTo ?? '',
      customerStatuses: params.customerStatuses?.join(',') ?? '',
      healthScoreMin: params.healthScoreMin ?? '',
      healthScoreMax: params.healthScoreMax ?? '',
    })

    const getCached = unstable_cache(
      async () =>
        fetchCountsFromDb(
          ctx.orgId,
          ctx.userId,
          elevated,
          hidePiiFromMembers,
          params,
        ),
      [`contacts-counts-${ctx.orgId}-${ctx.userId}-${elevated}-${paramsKey}`],
      {
        tags: [`contacts:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
