'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteDeal = orgActionClient
  .schema(deleteDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar)
    requirePermission(canPerformAction(ctx, 'deal', 'delete'))

    // 2. Verifica se o deal existe na organização
    const deal = await db.deal.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!deal) {
      throw new Error('Negócio não encontrado.')
    }

    await db.deal.delete({
      where: { id: data.id },
    })

    revalidatePath('/pipeline')
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
