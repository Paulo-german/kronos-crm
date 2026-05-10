'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createServiceSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createService = orgActionClient
  .schema(createServiceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'service', 'create'))

    // 2. Sem quota no v1

    // 3. Verificar que a categoria pertence à org
    const category = await db.serviceCategory.findFirst({
      where: { id: data.categoryId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!category) {
      throw new Error('Categoria não encontrada ou não pertence à organização.')
    }

    // 4. Criar o serviço
    const service = await db.service.create({
      data: {
        organizationId: ctx.orgId,
        categoryId: data.categoryId,
        name: data.name,
        duration: data.duration,
        price: data.price,
        isActive: data.isActive,
      },
    })

    // 5. Invalidar cache
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true, serviceId: service.id }
  })
