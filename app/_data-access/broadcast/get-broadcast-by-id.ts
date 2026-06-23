import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type {
  ConnectionType,
  BroadcastStatus,
  BroadcastRecipientStatus,
} from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type RecipientStatusCounts = Record<BroadcastRecipientStatus, number>

export interface BroadcastDetailDto {
  id: string
  name: string
  inboxId: string
  inboxName: string
  connectionType: ConnectionType
  messageContent: string | null
  templateName: string | null
  templateLanguage: string | null
  templateParams: string[] | null
  throttleMs: number
  status: BroadcastStatus
  totalRecipients: number
  sentCount: number
  failedCount: number
  scheduledFor: Date | null
  startedAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  createdBy: string
  createdByName: string | null
  createdAt: Date
  // Agregado por status dos destinatários (para a tela de detalhe)
  recipientCounts: RecipientStatusCounts
}

const EMPTY_COUNTS: RecipientStatusCounts = {
  PENDING: 0,
  SENDING: 0,
  SENT: 0,
  FAILED: 0,
  SKIPPED: 0,
}

const fetchBroadcastByIdFromDb = async (
  broadcastId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<BroadcastDetailDto | null> => {
  const broadcast = await db.broadcast.findFirst({
    where: {
      id: broadcastId,
      organizationId: orgId,
      // RBAC: MEMBER só acessa os próprios (404 caso contrário)
      ...(elevated ? {} : { createdBy: userId }),
    },
    select: {
      id: true,
      name: true,
      inboxId: true,
      connectionType: true,
      messageContent: true,
      templateName: true,
      templateLanguage: true,
      templateParams: true,
      throttleMs: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      scheduledFor: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      createdBy: true,
      createdAt: true,
      inbox: { select: { name: true } },
      creator: { select: { fullName: true } },
    },
  })

  if (!broadcast) return null

  // Contadores por status via groupBy (fonte da verdade da tela de detalhe)
  const grouped = await db.broadcastRecipient.groupBy({
    by: ['status'],
    where: { broadcastId },
    _count: { _all: true },
  })

  const recipientCounts = { ...EMPTY_COUNTS }
  grouped.forEach((row) => {
    recipientCounts[row.status] = row._count._all
  })

  return {
    id: broadcast.id,
    name: broadcast.name,
    inboxId: broadcast.inboxId,
    inboxName: broadcast.inbox.name,
    connectionType: broadcast.connectionType,
    messageContent: broadcast.messageContent,
    // templateParams é Json no banco; v1 grava sempre string[]
    templateName: broadcast.templateName,
    templateLanguage: broadcast.templateLanguage,
    templateParams: (broadcast.templateParams as string[] | null) ?? null,
    throttleMs: broadcast.throttleMs,
    status: broadcast.status,
    totalRecipients: broadcast.totalRecipients,
    sentCount: broadcast.sentCount,
    failedCount: broadcast.failedCount,
    scheduledFor: broadcast.scheduledFor,
    startedAt: broadcast.startedAt,
    completedAt: broadcast.completedAt,
    cancelledAt: broadcast.cancelledAt,
    createdBy: broadcast.createdBy,
    createdByName: broadcast.creator.fullName,
    createdAt: broadcast.createdAt,
    recipientCounts,
  }
}

/**
 * Detalhe de um disparo por ID (Cacheado).
 * RBAC: MEMBER só vê os próprios — retorna null (404) caso contrário.
 */
export const getBroadcastById = cache(
  async (
    broadcastId: string,
    ctx: RBACContext,
  ): Promise<BroadcastDetailDto | null> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchBroadcastByIdFromDb(broadcastId, ctx.orgId, ctx.userId, elevated),
      [`broadcast-${broadcastId}-${ctx.userId}-${elevated}`],
      {
        tags: [`broadcasts:${ctx.orgId}`, `broadcast:${broadcastId}`],
        revalidate: 60,
      },
    )

    return getCached()
  },
)
