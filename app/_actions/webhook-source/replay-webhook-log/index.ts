'use server'

import { revalidateTag } from 'next/cache'
import { superAdminOrgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { processInboundWebhook } from '@/_lib/webhooks/process-inbound-webhook'
import { replayWebhookLogSchema } from '../schema'

export const replayWebhookLog = superAdminOrgActionClient
  .schema(replayWebhookLogSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'update'))

    const original = await db.webhookLog.findFirst({
      where: { id: data.logId, organizationId: ctx.orgId },
      include: { webhookSource: true },
    })

    if (!original) {
      throw new Error('Log não encontrado.')
    }

    await processInboundWebhook({
      source: {
        id: original.webhookSource.id,
        organizationId: original.webhookSource.organizationId,
        platform: original.webhookSource.platform,
        eventType: original.webhookSource.eventType,
        fieldMapping: original.webhookSource.fieldMapping as Record<string, string>,
        isActive: original.webhookSource.isActive,
        secretKey: original.webhookSource.secretKey,
      },
      payload: original.payload,
      // Replay nunca propaga externalEventId — evita colisão com dedup window do original
      externalEventId: null,
      isReplay: true,
    })

    revalidateTag(`webhook-logs:${original.webhookSourceId}`)
    revalidateTag(`webhook-sources:${ctx.orgId}`)

    return { success: true }
  })
