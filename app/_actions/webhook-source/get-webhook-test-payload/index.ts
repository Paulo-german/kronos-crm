'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { getWebhookTestPayloadSchema } from './schema'

export const getWebhookTestPayload = orgActionClient
  .schema(getWebhookTestPayloadSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'read'))

    const source = await db.webhookSource.findFirst({
      where: { id: data.webhookSourceId, organizationId: ctx.orgId },
      select: { lastTestPayload: true, lastTestAt: true },
    })

    if (!source) {
      throw new Error('Webhook source não encontrada.')
    }

    return {
      payload: source.lastTestPayload ?? null,
      receivedAt: source.lastTestAt ?? null,
    }
  })
