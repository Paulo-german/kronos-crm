import { task, logger } from '@trigger.dev/sdk/v3'
import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'
import { db } from '@/_lib/prisma'

export interface ProcessProductEmbeddingPayload {
  productId: string
  organizationId: string
  textToEmbed: string
}

async function revalidateProductCache(orgId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn('Skipping product cache revalidation: missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET')
    return
  }

  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`

  try {
    await fetch(`${baseUrl}/api/product/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ orgId }),
    })
  } catch (error) {
    logger.warn('Product cache revalidation failed', { error })
  }
}

export const processProductEmbedding = task({
  id: 'process-product-embedding',
  retry: { maxAttempts: 2 },
  run: async (payload: ProcessProductEmbeddingPayload) => {
    const { productId, organizationId, textToEmbed } = payload

    // 1. Validar que o texto não está vazio
    if (!textToEmbed.trim()) {
      logger.warn('Empty text for product embedding — skipping', { productId })
      return { success: false, reason: 'empty_text' }
    }

    logger.info('Generating product embedding', {
      productId,
      organizationId,
      textLength: textToEmbed.length,
    })

    // 2. Gerar embedding via Vercel AI SDK
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: textToEmbed,
    })

    const embeddingStr = `[${embedding.join(',')}]`

    // 3. Salvar via raw SQL — Prisma não suporta o tipo vector nativamente
    await db.$executeRaw`
      UPDATE products
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${productId}
        AND organization_id = ${organizationId}
    `

    logger.info('Product embedding updated', { productId, organizationId })

    // 4. Revalidar cache de produtos para que a UI reflita o embedding gerado
    await revalidateProductCache(organizationId)

    return { success: true }
  },
})
