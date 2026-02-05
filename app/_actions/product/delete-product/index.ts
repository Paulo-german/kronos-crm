'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteProductSchema = z.object({
  id: z.string().uuid(),
})

export const deleteProduct = orgActionClient
  .schema(deleteProductSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar produtos)
    requirePermission(canPerformAction(ctx, 'product', 'delete'))

    // 2. Verifica se o produto existe e pertence à organização
    const product = await db.product.findFirst({
      where: {
        id,
        organizationId: ctx.orgId,
      },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    await db.product.delete({
      where: { id },
    })

    revalidateTag(`products:${ctx.orgId}`)
    revalidatePath('/products')

    return { success: true }
  })
