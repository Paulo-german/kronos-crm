'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { superAdminOrgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { updateWebhookSourceSchema } from '../schema'

export const updateWebhookSource = superAdminOrgActionClient
  .schema(updateWebhookSourceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'update'))

    // Garante que o source pertence à org antes do update
    const existing = await db.webhookSource.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Webhook source não encontrado.')
    }

    await db.webhookSource.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.platform !== undefined ? { platform: data.platform } : {}),
        ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
        ...(data.fieldMapping !== undefined
          ? { fieldMapping: data.fieldMapping as Prisma.InputJsonValue }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    revalidateTag(`webhook-sources:${ctx.orgId}`)
    revalidateTag(`webhook-source:${data.id}`)

    return { success: true }
  })
