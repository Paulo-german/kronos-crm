'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { addDealLineItemSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { recalculateDealValue } from '@/_lib/deal-value'

export const addDealLineItem = orgActionClient
  .schema(addDealLineItemSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (line items são parte do deal)
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC (ownership + organização)
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Validar que o item referenciado pertence à org
    if (data.itemType === 'PRODUCT') {
      const product = await db.product.findFirst({
        where: { id: data.productId, organizationId: ctx.orgId },
        select: { id: true },
      })
      if (!product) {
        throw new Error('Produto não encontrado.')
      }
    } else if (data.itemType === 'SERVICE') {
      const service = await db.service.findFirst({
        where: { id: data.serviceId, organizationId: ctx.orgId },
        select: { id: true },
      })
      if (!service) {
        throw new Error('Serviço não encontrado.')
      }
    } else {
      const promotion = await db.promotion.findFirst({
        where: { id: data.promotionId, organizationId: ctx.orgId },
        select: { id: true },
      })
      if (!promotion) {
        throw new Error('Promoção não encontrada.')
      }
    }

    // 4. Cria o DealLineItem
    const lineItem = await db.dealLineItem.create({
      data: {
        dealId: data.dealId,
        organizationId: ctx.orgId,
        itemType: data.itemType,
        productId: data.productId ?? null,
        serviceId: data.serviceId ?? null,
        promotionId: data.promotionId ?? null,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    })

    // 5. Recalcular valor do deal
    await recalculateDealValue(data.dealId)

    // 6. Invalidar cache
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    return { success: true, lineItemId: lineItem.id }
  })
