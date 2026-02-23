'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteLostReasonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteLostReason = orgActionClient
  .schema(deleteLostReasonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verificar permissão
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // 1. Reatribuir deals que usam este motivo
    // Se um replacementId foi fornecido, migra os deals para o novo motivo
    // Caso contrário, remove a associação (null)
    await db.deal.updateMany({
      where: {
        organizationId: ctx.orgId,
        lossReasonId: data.id,
      },
      data: {
        lossReasonId: data.replacementId ?? null,
      },
    })

    // 2. Deletar o motivo
    await db.dealLostReason.delete({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
