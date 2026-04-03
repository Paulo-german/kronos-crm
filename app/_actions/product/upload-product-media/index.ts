'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createMediaUploadUrlSchema, confirmMediaUploadSchema, isVideoType } from './schema'
import { db } from '@/_lib/prisma'
import { getB2Client } from '@/_lib/b2/client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { revalidateTag } from 'next/cache'
import { randomUUID } from 'crypto'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_IMAGES_PER_PRODUCT,
  MAX_VIDEOS_PER_PRODUCT,
} from '@/_lib/product-media-constants'

const BUCKET = process.env.B2_BUCKET_NAME ?? 'kronos-media'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

// ---------------------------------------------------------------------------
// Step 1: Gerar pre-signed URL para upload direto ao B2
// ---------------------------------------------------------------------------

export const createMediaUploadUrl = orgActionClient
  .schema(createMediaUploadUrlSchema)
  .action(async ({ parsedInput: { productId, mimeType, fileSize }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Ownership check
    const product = await db.product.findFirst({
      where: { id: productId, organizationId: ctx.orgId },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    // 3. Validar tamanho
    const isVideo = isVideoType(mimeType)
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    const maxSizeLabel = isVideo ? '20MB' : '5MB'

    if (fileSize > maxSize) {
      throw new Error(`Arquivo excede o limite de ${maxSizeLabel}.`)
    }

    // 4. Validar contagem de mídias existentes
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE'
    const maxCount = isVideo ? MAX_VIDEOS_PER_PRODUCT : MAX_IMAGES_PER_PRODUCT
    const typeLabel = isVideo ? 'vídeo' : 'imagem'

    const existingCount = await db.productMedia.count({
      where: { productId, organizationId: ctx.orgId, type: mediaType },
    })

    if (existingCount >= maxCount) {
      throw new Error(`Limite de ${maxCount} ${typeLabel}(s) por produto atingido.`)
    }

    // 5. Gerar path e pre-signed URL
    const ext = MIME_TO_EXT[mimeType] ?? 'bin'
    const fileId = randomUUID()
    const storagePath = `${ctx.orgId}/products/${productId}/${fileId}.${ext}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      ContentType: mimeType,
    })

    const uploadUrl = await getSignedUrl(getB2Client(), command, { expiresIn: 300 })

    return { uploadUrl, storagePath }
  })

// ---------------------------------------------------------------------------
// Step 3: Confirmar upload e criar registro no banco
// ---------------------------------------------------------------------------

export const confirmMediaUpload = orgActionClient
  .schema(confirmMediaUploadSchema)
  .action(async ({ parsedInput: { productId, storagePath, fileName, mimeType, fileSize }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'product', 'update'))

    // 2. Ownership check
    const product = await db.product.findFirst({
      where: { id: productId, organizationId: ctx.orgId },
    })

    if (!product) {
      throw new Error('Produto não encontrado.')
    }

    // 3. Revalidar contagem (proteção contra race condition)
    const isVideo = isVideoType(mimeType)
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE'
    const maxCount = isVideo ? MAX_VIDEOS_PER_PRODUCT : MAX_IMAGES_PER_PRODUCT
    const typeLabel = isVideo ? 'vídeo' : 'imagem'

    const existingCount = await db.productMedia.count({
      where: { productId, organizationId: ctx.orgId, type: mediaType },
    })

    if (existingCount >= maxCount) {
      throw new Error(`Limite de ${maxCount} ${typeLabel}(s) por produto atingido.`)
    }

    // 4. Construir URL pública
    const publicBaseUrl = process.env.B2_PUBLIC_URL
    if (!publicBaseUrl) {
      throw new Error('B2_PUBLIC_URL não configurado.')
    }

    const publicUrl = `${publicBaseUrl}/${storagePath}`

    // 5. Criar registro no banco
    const media = await db.productMedia.create({
      data: {
        productId,
        organizationId: ctx.orgId,
        type: mediaType,
        url: publicUrl,
        storagePath,
        fileName,
        mimeType,
        fileSize,
        order: existingCount + 1,
      },
    })

    // 6. Invalidar cache
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
