import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma, WebhookLogStatus } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'

interface GetLogsOptions {
  page: number
  pageSize: number
  status?: WebhookLogStatus[]
  since?: Date
}

export async function getWebhookLogsBySource(
  webhookSourceId: string,
  ctx: RBACContext,
  options: GetLogsOptions,
) {
  const { page, pageSize, status, since } = options

  const where: Prisma.WebhookLogWhereInput = {
    webhookSourceId,
    organizationId: ctx.orgId,
    ...(status?.length ? { status: { in: status } } : {}),
    ...(since ? { receivedAt: { gte: since } } : {}),
  }

  const cacheKey = `webhook-logs-${webhookSourceId}-${page}-${pageSize}-${(status ?? []).join(',')}-${since?.getTime() ?? ''}`

  const getCached = unstable_cache(
    async () => {
      const [logs, total] = await db.$transaction([
        db.webhookLog.findMany({
          where,
          orderBy: { receivedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
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
        db.webhookLog.count({ where }),
      ])
      return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    },
    [cacheKey],
    { tags: [`webhook-logs:${webhookSourceId}`] },
  )

  return getCached()
}
