'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { tasks } from '@trigger.dev/sdk/v3'

export const updateProduct = orgActionClient
  .schema(updateProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem editar produtos)
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Verifica se o produto existe e pertence à organização
    const existingProduct = await db.product.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!existingProduct) {
      throw new Error('Produto não encontrado.')
    }

    await db.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    // Re-disparar embedding se name ou description mudaram
    // O task process-product-embedding será criado no Step 5
    const nameChanged = data.name !== existingProduct.name
    const descriptionChanged = (data.description ?? null) !== existingProduct.description

    if (nameChanged || descriptionChanged) {
      const textToEmbed = `${data.name} ${data.description ?? ''}`.trim()
      if (textToEmbed) {
        void tasks.trigger('process-product-embedding', {
          productId: data.id,
          organizationId: ctx.orgId,
          textToEmbed,
        })
      }
    }

    revalidateTag(`products:${ctx.orgId}`)
    revalidatePath('/org/[orgSlug]/settings/products', 'page')

    return { success: true }
  })
