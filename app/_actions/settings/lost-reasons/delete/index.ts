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

    // 1. Remover a associação dos Deals que usam este motivo
    // Isso garante que os deals não fiquem com referência quebrada
    // Eles continuarão como LOST, mas sem motivo específico (null)
    await db.deal.updateMany({
      where: {
        organizationId: ctx.orgId,
        lossReasonId: data.id,
      },
      data: {
        lossReasonId: null,
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

    return { success: true }
  })
