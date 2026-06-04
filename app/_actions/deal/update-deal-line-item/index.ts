'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateDealLineItemSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { recalculateDealValue } from '@/_lib/deal-value'

export const updateDealLineItem = orgActionClient
  .schema(updateDealLineItemSchema)
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

    // 4. Atualizar campos do line item
    await db.dealLineItem.update({
      where: { id: lineItem.id },
      data: {
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    })

    // 5. Recalcular valor do deal
    await recalculateDealValue(lineItem.dealId)

    // 6. Invalidar cache
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${lineItem.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    return { success: true, lineItemId: lineItem.id }
  })
