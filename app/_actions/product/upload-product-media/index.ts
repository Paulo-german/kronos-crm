'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { uploadProductMediaSchema } from './schema'
import { db } from '@/_lib/prisma'
import { getB2Client } from '@/_lib/b2/client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidateTag } from 'next/cache'
import { randomUUID } from 'crypto'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_IMAGES_PER_PRODUCT,
  MAX_VIDEOS_PER_PRODUCT,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '@/_lib/product-media-constants'

const BUCKET = process.env.B2_BUCKET_NAME ?? 'kronos-media'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

export const uploadProductMedia = orgActionClient
  .schema(uploadProductMediaSchema)
  .action(async ({ parsedInput: { file, productId }, ctx }) => {
    // 1. RBAC — apenas ADMIN/OWNER podem atualizar produtos
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Ownership check — produto pertence à organização
    const product = await db.product.findFirst({
      where: { id: productId, organizationId: ctx.orgId },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    // 3. Validar tipo MIME
    const mimeType = file.type || 'application/octet-stream'
    const isImage = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
    const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)

    if (!isImage && !isVideo) {
      throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WebP, MP4 ou QuickTime.')
    }

    // 4. Validar tamanho
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    const maxSizeLabel = isVideo ? '20MB' : '5MB'

    if (file.size > maxSize) {
      throw new Error(`Arquivo excede o limite de ${maxSizeLabel}.`)
    }

    // 5. Validar contagem de mídias existentes
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE'
    const maxCount = isVideo ? MAX_VIDEOS_PER_PRODUCT : MAX_IMAGES_PER_PRODUCT
    const typeLabel = isVideo ? 'vídeo' : 'imagem'

    const existingCount = await db.productMedia.count({
      where: { productId, organizationId: ctx.orgId, type: mediaType },
    })

    if (existingCount >= maxCount) {
      throw new Error(`Limite de ${maxCount} ${typeLabel}(s) por produto atingido.`)
    }

    // 6. Upload para B2
    const ext = MIME_TO_EXT[mimeType] ?? 'bin'
    const fileId = randomUUID()
    const storagePath = `${ctx.orgId}/products/${productId}/${fileId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await getB2Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: storagePath,
        Body: buffer,
        ContentType: mimeType,
      }),
    )

    const publicBaseUrl = process.env.B2_PUBLIC_URL
    if (!publicBaseUrl) {
      throw new Error('B2_PUBLIC_URL não configurado.')
    }

    const publicUrl = `${publicBaseUrl}/${storagePath}`

    // 7. Criar registro no banco com order = count + 1 (auto-order)
    const media = await db.productMedia.create({
      data: {
        productId,
        organizationId: ctx.orgId,
        type: mediaType,
        url: publicUrl,
        storagePath,
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        order: existingCount + 1,
      },
    })

    // 8. Invalidar cache
    revalidateTag(`products:${ctx.orgId}`)
    revalidateTag(`product-media:${productId}`)

    return {
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        order: media.order,
      },
    }
  })
