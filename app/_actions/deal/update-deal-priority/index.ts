'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateDealPrioritySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const updateDealPriority = orgActionClient
  .schema(updateDealPrioritySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Atualiza prioridade com Log
    await db.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: data.dealId },
        data: {
          priority: data.priority,
        },
      })

      await tx.activity.create({
        data: {
          dealId: data.dealId,
          type: 'priority_changed',
          content: `Prioridade alterada para ${data.priority}`,
          performedBy: ctx.userId,
        },
      })
    })

    revalidatePath('/crm/deals/pipeline')
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)

    return { success: true }
  })
