'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeDealProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const removeDealProduct = orgActionClient
  .schema(removeDealProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Busca o DealProduct
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
      throw new Error('Produto não encontrado.')
    }

    // 2. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 3. Verificar acesso ao deal via RBAC
    await findDealWithRBAC(dealProduct.dealId, ctx)

    // 4. Remove
    await db.dealProduct.delete({
      where: { id: data.dealProductId },
    })

    await db.activity.create({
      data: {
        type: 'product_removed',
        content: dealProduct.product.name,
        dealId: dealProduct.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${dealProduct.dealId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
