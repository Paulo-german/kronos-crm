'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { productSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'

export const createProduct = orgActionClient
  .schema(productSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem criar produtos)
    requirePermission(canPerformAction(ctx, 'product', 'create'))

    // 2. Verificar quota do plano
    await requireQuota(ctx.orgId, 'product')

    const product = await db.product.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        description: data.description || null,
        price: data.price,
      },
    })

    revalidateTag(`products:${ctx.orgId}`)
    revalidatePath('/products')

    return { success: true, productId: product.id }
  })
