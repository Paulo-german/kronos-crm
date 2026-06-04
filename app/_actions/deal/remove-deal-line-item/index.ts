'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeDealLineItemSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { recalculateDealValue } from '@/_lib/deal-value'

export const removeDealLineItem = orgActionClient
  .schema(removeDealLineItemSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar lineItem e verificar que pertence à org
    const lineItem = await db.dealLineItem.findFirst({
      where: {
        id: data.lineItemId,
        organizationId: ctx.orgId,
      },
      select: { id: true, dealId: true },
    })

    if (!lineItem) {
      throw new Error('Item não encontrado ou acesso negado.')
    }

    // 3. RBAC granular: garantir acesso ao deal
    await findDealWithRBAC(lineItem.dealId, ctx)

    // 4. Remover line item
    await db.dealLineItem.delete({
      where: { id: lineItem.id },
    })

    // 5. Recalcular valor do deal
    await recalculateDealValue(lineItem.dealId)

    // 6. Invalidar cache
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${lineItem.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    return { success: true }
  })
