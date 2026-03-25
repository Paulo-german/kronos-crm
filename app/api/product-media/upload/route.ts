import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { getB2Client } from '@/_lib/b2/client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidateTag } from 'next/cache'
import { randomUUID } from 'crypto'
import type { MemberRole } from '@prisma/client'
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_IMAGES_PER_PRODUCT,
  MAX_VIDEOS_PER_PRODUCT,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '@/_lib/product-media-constants'

const BUCKET = process.env.B2_BUCKET_NAME ?? 'kronos-media'

// Mapa de extensões para os tipos MIME aceitos
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
}

function getExtension(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'bin'
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — replicando padrão do orgActionClient
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado.' },
        { status: 401 },
      )
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Organização não encontrada.' },
        { status: 400 },
      )
    }

    const membership = await validateMembership(user.id, orgSlug)

    if (!membership.isValid || !membership.orgId || !membership.userRole) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta organização.' },
        { status: 403 },
      )
    }

    // 2. RBAC — apenas ADMIN/OWNER podem atualizar produtos
    const ctx = {
      userId: user.id,
      orgId: membership.orgId,
      userRole: membership.userRole as MemberRole,
    }

    try {
      requirePermission(canPerformAction(ctx, 'product', 'update'))
    } catch {
      return NextResponse.json(
        { error: 'Você não tem permissão para fazer upload de mídias de produtos.' },
        { status: 403 },
      )
    }

    // 3. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productId = formData.get('productId') as string | null

    if (!file || !productId) {
      return NextResponse.json(
        { error: 'Arquivo e productId são obrigatórios.' },
        { status: 400 },
      )
    }

    // 4. Verificar que o produto pertence à organização (ownership check)
    const product = await db.product.findFirst({
      where: { id: productId, organizationId: ctx.orgId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado.' },
        { status: 404 },
      )
    }

    // 5. Validar tipo MIME
    const mimeType = file.type || 'application/octet-stream'
    const isImage = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
    const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPEG, PNG, WebP, MP4 ou QuickTime.' },
        { status: 400 },
      )
    }

    // 6. Validar tamanho
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio.' },
        { status: 400 },
      )
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    const maxSizeLabel = isVideo ? '20MB' : '5MB'

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo excede o limite de ${maxSizeLabel}.` },
        { status: 400 },
      )
    }

    // 7. Validar contagem de mídias existentes
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE'
    const maxCount = isVideo ? MAX_VIDEOS_PER_PRODUCT : MAX_IMAGES_PER_PRODUCT
    const typeLabel = isVideo ? 'vídeo' : 'imagem'

    const existingCount = await db.productMedia.count({
      where: { productId, organizationId: ctx.orgId, type: mediaType },
    })

    if (existingCount >= maxCount) {
      return NextResponse.json(
        {
          error: `Limite de ${maxCount} ${typeLabel}(s) por produto atingido.`,
        },
        { status: 400 },
      )
    }

    // 8. Upload para B2
    const ext = getExtension(mimeType)
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

    // 9. Criar registro no banco com order = count + 1 (auto-order)
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

    // 10. Invalidar cache
    revalidateTag(`products:${ctx.orgId}`)
    revalidateTag(`product-media:${productId}`)

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        order: media.order,
      },
    })
  } catch (error) {
    console.error('Product media upload error:', error)

    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
