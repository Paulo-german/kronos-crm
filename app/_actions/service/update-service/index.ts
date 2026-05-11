'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateServiceSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'

export const updateService = orgActionClient
  .schema(updateServiceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'service', 'update'))

    // 2. Verificar que o serviço pertence à org
    // Selecionamos `name` para detectar mudança e decidir se re-gera embedding
    const service = await db.service.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, name: true },
    })

    if (!service) {
      throw new Error('Serviço não encontrado.')
    }

    // 3. Se nova categoria fornecida, verificar que pertence à org
    if (data.categoryId) {
      const category = await db.serviceCategory.findFirst({
        where: { id: data.categoryId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!category) {
        throw new Error('Categoria não encontrada ou não pertence à organização.')
      }
    }

    // 4. Atualizar apenas campos fornecidos
    await db.service.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    // 5. Re-gerar embedding inline apenas se o nome mudou — search_service depende dele.
    // Falha aqui aborta a action para não deixar o vetor stale em silêncio.
    if (data.name !== undefined && data.name !== service.name) {
      const { embedding } = await embed({
        model: getEmbeddingModel(),
        value: data.name,
      })

      const embeddingStr = `[${embedding.join(',')}]`

      // Prisma não suporta o tipo vector nativamente — precisa de raw SQL
      await db.$executeRaw`
        UPDATE services
        SET embedding = ${embeddingStr}::vector
        WHERE id = ${data.id}
          AND organization_id = ${ctx.orgId}
      `
    }

    // 6. Invalidar cache
    revalidateTag(`services:${ctx.orgId}`)
    revalidateTag(`service:${data.id}`)

    return { success: true }
  })
