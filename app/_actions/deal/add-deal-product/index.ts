'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { addDealProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const addDealProduct = orgActionClient
  .schema(addDealProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Verifica ownership do produto via organização
    const product = await db.product.findFirst({
      where: {
        id: data.productId,
        organizationId: ctx.orgId,
      },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    // 4. Cria o DealProduct
    const dealProduct = await db.dealProduct.create({
      data: {
        dealId: data.dealId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    })

    await db.activity.create({
      data: {
        type: 'product_added',
        content: `${product.name} (${data.quantity}x)`,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true, dealProductId: dealProduct.id }
  })
