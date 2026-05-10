'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createServiceCategorySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createServiceCategory = orgActionClient
  .schema(createServiceCategorySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'serviceCategory', 'create'))

    // 2. Verificar unicidade do nome na org (constraint @@unique([organizationId, name]))
    const existing = await db.serviceCategory.findFirst({
      where: { organizationId: ctx.orgId, name: data.name },
      select: { id: true },
    })

    if (existing) {
      throw new Error('Já existe uma categoria com este nome.')
    }

    // 3. Criar a categoria
    const category = await db.serviceCategory.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        isActive: data.isActive,
      },
    })

    // 4. Invalidar cache
    revalidateTag(`service-categories:${ctx.orgId}`)
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true, categoryId: category.id }
  })
