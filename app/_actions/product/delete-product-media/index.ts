'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteProductMediaSchema } from './schema'
import { db } from '@/_lib/prisma'
import { getB2Client } from '@/_lib/b2/client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { invalidateProductCatalogCache } from '@/_lib/cache/invalidate-product-catalog'

const BUCKET = process.env.B2_BUCKET_NAME ?? 'kronos-media'

export const deleteProductMedia = orgActionClient
  .schema(deleteProductMediaSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC — apenas ADMIN/OWNER podem editar produtos
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Ownership check — mídia pertence ao produto e à org
    const media = await db.productMedia.findFirst({
      where: {
        id: data.mediaId,
        productId: data.productId,
        organizationId: ctx.orgId,
      },
    })

    if (!media) {
      throw new Error('Mídia não encontrada.')
    }

    // 3. Deletar do banco
    await db.productMedia.delete({
      where: { id: data.mediaId },
    })

    // 4. Deletar do B2 (best-effort — não bloqueia se falhar)
    try {
      await getB2Client().send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: media.storagePath,
        }),
      )
    } catch (error) {
      console.warn('Falha ao deletar mídia do B2 (best-effort):', error)
    }

    // 5. Invalidar cache
    revalidateTag(`products:${ctx.orgId}`)
    revalidateTag(`product-media:${data.productId}`)
    await invalidateProductCatalogCache(ctx.orgId)

    return { success: true }
  })
