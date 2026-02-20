'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateDealProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { formatCurrency } from '@/_utils/format-currency'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import { recalculateDealValue } from '@/_lib/deal-value'

export const updateDealProduct = orgActionClient
  .schema(updateDealProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC Check
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar Produto com contexto da Org
    const dealProduct = await db.dealProduct.findFirst({
      where: {
        id: data.dealProductId,
        deal: {
          organizationId: ctx.orgId,
        },
      },
      include: {
        product: true,
        deal: true,
      },
    })

    if (!dealProduct) {
      throw new Error('Produto não encontrado ou acesso negado.')
    }

    // 3. Verificar acesso ao Deal (RBAC granular)
    await findDealWithRBAC(dealProduct.dealId, ctx)

    // 4. Transaction: Update + Audit Log
    const updated = await db.$transaction(async (tx) => {
      const productUpdated = await tx.dealProduct.update({
        where: { id: data.dealProductId },
        data: {
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          discountType: data.discountType,
          discountValue: data.discountValue,
        },
      })

      // Log da atividade
      const content = `${dealProduct.product.name} atualizado (Qtd: ${data.quantity}, Preço: ${formatCurrency(data.unitPrice)}, Desc: ${data.discountValue})`
      await tx.activity.create({
        data: {
          dealId: dealProduct.dealId,
          type: 'product_updated',
          content,
          performedBy: ctx.userId,
        },
      })

      return productUpdated
    })

    await recalculateDealValue(dealProduct.dealId)

    // 6. Cache Invalidation
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deal:${dealProduct.dealId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidatePath('/crm/pipeline')

    return { success: true, dealProductId: updated.id }
  })
