'use server'

import { randomUUID } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { regenerateWebhookTokenSchema } from '../schema'

export const regenerateWebhookToken = orgActionClient
  .schema(regenerateWebhookTokenSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'update'))

    const existing = await db.webhookSource.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Webhook source não encontrada.')
    }

    const newToken = randomUUID()

    await db.webhookSource.update({
      where: { id: data.id },
      data: { token: newToken },
    })

    revalidateTag(`webhook-sources:${ctx.orgId}`)
    revalidateTag(`webhook-source:${data.id}`)

    return { success: true, token: newToken }
  })
