import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export interface BroadcastStats {
  // Disparos em andamento (RUNNING) ou agendados (SCHEDULED)
  activeCount: number
  totalSent: number
  totalFailed: number
  // Contatos efetivamente alcançados (mensagens entregues)
  totalReached: number
  // Entregues sobre tentativas (sent / (sent+failed)), 0–100
  deliveryRate: number
}

const fetchBroadcastStatsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<BroadcastStats> => {
  const where: Prisma.BroadcastWhereInput = {
    organizationId: orgId,
    // RBAC: MEMBER só agrega os próprios disparos
    ...(elevated ? {} : { createdBy: userId }),
  }

  const [aggregate, activeCount] = await Promise.all([
    db.broadcast.aggregate({
      where,
      _sum: { sentCount: true, failedCount: true },
    }),
    db.broadcast.count({
      where: { ...where, status: { in: ['RUNNING', 'SCHEDULED'] } },
    }),
  ])

  const totalSent = aggregate._sum.sentCount ?? 0
  const totalFailed = aggregate._sum.failedCount ?? 0
  const deliveryRate =
    totalSent + totalFailed > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 0

  return {
    activeCount,
    totalSent,
    totalFailed,
    totalReached: totalSent,
    deliveryRate,
  }
}

/**
 * Agregados dos disparos para a Home do Prospection (Cacheado).
 * RBAC: MEMBER só vê os próprios. Tag compartilhada com a lista.
 */
export const getBroadcastStats = async (
  ctx: RBACContext,
): Promise<BroadcastStats> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchBroadcastStatsFromDb(ctx.orgId, ctx.userId, elevated),
    [`broadcast-stats-${ctx.orgId}-${ctx.userId}-${elevated}`],
    {
      tags: [`broadcasts:${ctx.orgId}`],
      revalidate: 60,
    },
  )

  return getCached()
}
