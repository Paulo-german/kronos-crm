'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { reopenDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { ActivityType } from '@prisma/client'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const reopenDeal = orgActionClient
  .schema(reopenDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Atualiza status do deal para OPEN
    await db.deal.update({
      where: { id: data.dealId },
      data: { status: 'OPEN' },
    })

    await db.activity.create({
      data: {
        type: ActivityType.deal_reopened,
        content: 'Negociação retomada (Status: ABERTO)',
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
