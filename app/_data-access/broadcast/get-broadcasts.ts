import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma, ConnectionType, BroadcastStatus } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export interface BroadcastDto {
  id: string
  name: string
  inboxId: string
  inboxName: string
  connectionType: ConnectionType
  status: BroadcastStatus
  totalRecipients: number
  sentCount: number
  failedCount: number
  scheduledFor: Date | null
  startedAt: Date | null
  completedAt: Date | null
  createdBy: string
  createdByName: string | null
  createdAt: Date
}

export interface BroadcastListParams {
  page: number
  pageSize: number
  status?: BroadcastStatus
  search: string
  inboxId?: string
}

export interface BroadcastListResult {
  data: BroadcastDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const fetchBroadcastsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  params: BroadcastListParams,
): Promise<BroadcastListResult> => {
  const where: Prisma.BroadcastWhereInput = {
    organizationId: orgId,
    // RBAC: MEMBER só vê os disparos que ele mesmo criou
    ...(elevated ? {} : { createdBy: userId }),
    ...(params.status ? { status: params.status } : {}),
    ...(params.inboxId ? { inboxId: params.inboxId } : {}),
    ...(params.search.trim()
      ? {
          name: {
            contains: params.search.trim(),
            mode: 'insensitive' as const,
          },
        }
      : {}),
  }

  const [total, broadcasts] = await Promise.all([
    db.broadcast.count({ where }),
    db.broadcast.findMany({
      where,
      select: {
        id: true,
        name: true,
        inboxId: true,
        connectionType: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        scheduledFor: true,
        startedAt: true,
        completedAt: true,
        createdBy: true,
        createdAt: true,
        inbox: { select: { name: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  return {
    data: broadcasts.map((broadcast) => ({
      id: broadcast.id,
      name: broadcast.name,
      inboxId: broadcast.inboxId,
      inboxName: broadcast.inbox.name,
      connectionType: broadcast.connectionType,
      status: broadcast.status,
      totalRecipients: broadcast.totalRecipients,
      sentCount: broadcast.sentCount,
      failedCount: broadcast.failedCount,
      scheduledFor: broadcast.scheduledFor,
      startedAt: broadcast.startedAt,
      completedAt: broadcast.completedAt,
      createdBy: broadcast.createdBy,
      createdByName: broadcast.creator.fullName,
      createdAt: broadcast.createdAt,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  }
}

/**
 * Lista paginada de disparos da organização (Cacheado).
 * RBAC: MEMBER só vê os próprios (filtro por createdBy).
 *
 * revalidate baixo: durante RUNNING o sentCount sobe rápido (worker invalida
 * broadcasts:${orgId} a cada chunk; o TTL é só um teto de segurança).
 */
export const getBroadcasts = async (
  ctx: RBACContext,
  params: BroadcastListParams,
): Promise<BroadcastListResult> => {
  const elevated = isElevated(ctx.userRole)

  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    status: params.status ?? '',
    search: params.search,
    inboxId: params.inboxId ?? '',
  })

  const getCached = unstable_cache(
    async () => fetchBroadcastsFromDb(ctx.orgId, ctx.userId, elevated, params),
    [`broadcasts-${ctx.orgId}-${ctx.userId}-${elevated}-${paramsKey}`],
    {
      tags: [`broadcasts:${ctx.orgId}`],
      revalidate: 60,
    },
  )

  return getCached()
}
