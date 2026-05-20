import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'

const fetchSourceById = async (id: string, orgId: string) => {
  const source = await db.webhookSource.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      name: true,
      token: true,
      platform: true,
      eventType: true,
      fieldMapping: true,
      isActive: true,
      lastReceivedAt: true,
      createdAt: true,
      updatedAt: true,
      // secretKey selecionado só para derivar `hasSecretKey` — não retornado ao client
      secretKey: true,
    },
  })

  if (!source) return null

  const { secretKey, ...safeSource } = source
  return { ...safeSource, hasSecretKey: secretKey !== null }
}

export const getWebhookSourceById = cache(async (id: string, ctx: RBACContext) => {
  const getCached = unstable_cache(
    async () => fetchSourceById(id, ctx.orgId),
    [`webhook-source-${id}-${ctx.orgId}`],
    { tags: [`webhook-source:${id}`, `webhook-sources:${ctx.orgId}`] },
  )
  return getCached()
})
