import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'

const fetchSourcesFromDb = async (orgId: string) => {
  const sources = await db.webhookSource.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      token: true,
      platform: true,
      eventType: true,
      providerEvent: true,
      fieldMapping: true,
      isActive: true,
      squadId: true,
      lastReceivedAt: true,
      createdAt: true,
      updatedAt: true,
      // secretKey é selecionado apenas para derivar `hasSecretKey` — nunca retornado ao client
      secretKey: true,
    },
  })

  const stats = await db.webhookLog.groupBy({
    by: ['webhookSourceId', 'status'],
    where: { organizationId: orgId },
    _count: { _all: true },
  })

  return sources.map((source) => {
    const sourceStats = stats.filter(
      (stat) => stat.webhookSourceId === source.id,
    )
    const totalEvents = sourceStats.reduce(
      (acc, stat) => acc + stat._count._all,
      0,
    )
    const processed =
      sourceStats.find((stat) => stat.status === 'PROCESSED')?._count._all ?? 0
    const successRate = totalEvents === 0 ? 0 : processed / totalEvents

    const { secretKey, ...safeSource } = source

    return {
      ...safeSource,
      hasSecretKey: secretKey !== null,
      stats: { totalEvents, successRate },
    }
  })
}

export const getWebhookSources = cache(async (ctx: RBACContext) => {
  const getCached = unstable_cache(
    async () => fetchSourcesFromDb(ctx.orgId),
    [`webhook-sources-${ctx.orgId}`],
    { tags: [`webhook-sources:${ctx.orgId}`] },
  )
  return getCached()
})
