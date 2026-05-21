'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { superAdminOrgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { createWebhookSourceSchema } from '../schema'

export const createWebhookSource = superAdminOrgActionClient
  .schema(createWebhookSourceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'webhookSource', 'create'))

    const created = await db.webhookSource.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        platform: data.platform,
        eventType: data.eventType,
        fieldMapping: data.fieldMapping as Prisma.InputJsonValue,
        isActive: data.isActive,
        secretKey: data.secretKey ?? null,
        squadId: data.squadId ?? null,
      },
      select: { id: true, token: true },
    })

    revalidateTag(`webhook-sources:${ctx.orgId}`)

    return { success: true, id: created.id, token: created.token }
  })
