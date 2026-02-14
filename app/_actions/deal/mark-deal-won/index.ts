'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { markDealWonSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType } from '@prisma/client'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const markDealWon = orgActionClient
  .schema(markDealWonSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Atualiza status do deal para WON
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'WON' },
    })

    await db.activity.create({
      data: {
        type: ActivityType.deal_won,
        content: 'Deal marcado como GANHO',
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
