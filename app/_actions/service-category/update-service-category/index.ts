'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateServiceCategorySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateServiceCategory = orgActionClient
  .schema(updateServiceCategorySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'serviceCategory', 'update'))

    // 2. Verificar que a categoria pertence à org
    const category = await db.serviceCategory.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!category) {
      throw new Error('Categoria não encontrada.')
    }

    // 3. Se novo nome fornecido, verificar unicidade na org
    if (data.name) {
      const conflicting = await db.serviceCategory.findFirst({
        where: {
          organizationId: ctx.orgId,
          name: data.name,
          id: { not: data.id },
        },
        select: { id: true },
      })

      if (conflicting) {
        throw new Error('Já existe outra categoria com este nome.')
      }
    }

    // 4. Atualizar apenas campos fornecidos
    await db.serviceCategory.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    // 5. Invalidar cache — mudança em categoria afeta a exibição de serviços
    revalidateTag(`service-categories:${ctx.orgId}`)
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true }
  })
