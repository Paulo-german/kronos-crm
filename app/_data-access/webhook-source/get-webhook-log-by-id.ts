import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'

export async function getWebhookLogById(logId: string, ctx: RBACContext) {
  const getCached = unstable_cache(
    async () =>
      db.webhookLog.findFirst({
        where: { id: logId, organizationId: ctx.orgId },
        select: {
          id: true,
          webhookSourceId: true,
          receivedAt: true,
          status: true,
          errorMessage: true,
          contactId: true,
          dealId: true,
          externalEventId: true,
          payload: true,
          resolvedData: true,
        },
      }),
    [`webhook-log-${logId}`],
    { tags: [`webhook-log:${logId}`] },
  )
  return getCached()
}
