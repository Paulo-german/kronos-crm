'use server'

import { revalidateTag } from 'next/cache'
import { superAdminOrgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { deleteWebhookSourceSchema } from '../schema'

export const deleteWebhookSource = superAdminOrgActionClient
  .schema(deleteWebhookSourceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // RBAC já restringe delete apenas para OWNER (ver permissions.ts)
    requirePermission(canPerformAction(ctx, 'webhookSource', 'delete'))

    const existing = await db.webhookSource.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Webhook source não encontrada.')
    }

    await db.webhookSource.delete({ where: { id: data.id } })

    revalidateTag(`webhook-sources:${ctx.orgId}`)
    revalidateTag(`webhook-source:${data.id}`)
    revalidateTag(`webhook-logs:${data.id}`)

    return { success: true }
  })
