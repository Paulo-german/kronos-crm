'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { updateWebhookSourceSchema } from '../schema'

export const updateWebhookSource = orgActionClient
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

    // Nova secret tem prioridade; só remove se clearSecretKey === true e não há novo valor
    const newSecret =
      data.secretKey && data.secretKey.length > 0 ? data.secretKey : undefined
    const secretKeyUpdate = newSecret
      ? { secretKey: newSecret }
      : data.clearSecretKey === true
        ? { secretKey: null }
        : {}

    await db.webhookSource.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.platform !== undefined ? { platform: data.platform } : {}),
        ...(data.eventType !== undefined ? { eventType: data.eventType } : {}),
        // undefined = sem alteração; null = limpar o filtro (volta ao comportamento legado)
        ...(data.providerEvent !== undefined
          ? { providerEvent: data.providerEvent }
          : {}),
        ...(data.fieldMapping !== undefined
          ? { fieldMapping: data.fieldMapping as Prisma.InputJsonValue }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...secretKeyUpdate,
        ...(data.squadId !== undefined ? { squadId: data.squadId } : {}),
      },
    })

    revalidateTag(`webhook-sources:${ctx.orgId}`)
    revalidateTag(`webhook-source:${data.id}`)

    return { success: true }
  })
