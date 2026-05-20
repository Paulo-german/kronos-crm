'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { getWebhookLogsBySource } from '@/_data-access/webhook-source/get-webhook-logs-by-source'
import { getWebhookLogsSchema } from '../schema'

export const getWebhookLogs = orgActionClient
  .schema(getWebhookLogsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'read'))

    // Cross-org guard: confirma que o source pertence à organização
    const source = await db.webhookSource.findFirst({
      where: { id: data.webhookSourceId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!source) {
      throw new Error('Webhook source não encontrada.')
    }

    return getWebhookLogsBySource(data.webhookSourceId, ctx, {
      page: data.page,
      pageSize: data.pageSize,
      status: data.status,
      since: data.since,
    })
  })
