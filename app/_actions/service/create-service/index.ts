'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createServiceSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { embed } from 'ai'
import { getEmbeddingModel } from '@/_lib/ai/provider'

export const createService = orgActionClient
  .schema(createServiceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'service', 'create'))

    // 2. Sem quota no v1

    // 3. Se categoria fornecida, verificar que pertence à org
    if (data.categoryId) {
      const category = await db.serviceCategory.findFirst({
        where: { id: data.categoryId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!category) {
        throw new Error('Categoria não encontrada ou não pertence à organização.')
      }
    }

    // 4. Gerar embedding antes da transaction — API externa não pode ficar dentro de tx
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: data.name,
    })
    const embeddingStr = `[${embedding.join(',')}]`

    // 5. Criar serviço e salvar embedding atomicamente — evita serviço órfão sem vetor
    const service = await db.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          organizationId: ctx.orgId,
          categoryId: data.categoryId ?? null,
          name: data.name,
          duration: data.duration,
          price: data.price,
          isActive: data.isActive,
        },
      })

      // Prisma não suporta o tipo vector nativamente — precisa de raw SQL
      await tx.$executeRaw`
        UPDATE services
        SET embedding = ${embeddingStr}::vector
        WHERE id = ${created.id}
          AND organization_id = ${ctx.orgId}
      `

      return created
    })

    // 6. Invalidar cache
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true, serviceId: service.id }
  })
