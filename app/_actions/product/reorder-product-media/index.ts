'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { reorderProductMediaSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const reorderProductMedia = orgActionClient
  .schema(reorderProductMediaSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC — apenas ADMIN/OWNER podem editar produtos
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Ownership check — produto pertence à org
    const product = await db.product.findFirst({
      where: { id: data.productId, organizationId: ctx.orgId },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    // 3. Validar que todos os mediaIds existem e pertencem ao produto
    const existingMedia = await db.productMedia.findMany({
      where: {
        productId: data.productId,
        organizationId: ctx.orgId,
      },
      select: { id: true },
    })

    const existingIds = new Set(existingMedia.map((media) => media.id))
    const invalidIds = data.mediaIds.filter((id) => !existingIds.has(id))

    if (invalidIds.length > 0) {
      throw new Error('Uma ou mais mídias não pertencem a este produto.')
    }

    // 4. Transaction — atualizar a ordem de cada mídia conforme a nova sequência
    await db.$transaction(
      data.mediaIds.map((mediaId, index) =>
        db.productMedia.update({
          where: { id: mediaId },
          data: { order: index },
        }),
      ),
    )

    // 5. Invalidar cache
    revalidateTag(`product-media:${data.productId}`)

    return { success: true }
  })
