'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteServiceCategorySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteServiceCategory = orgActionClient
  .schema(deleteServiceCategorySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas OWNER/ADMIN)
    requirePermission(canPerformAction(ctx, 'serviceCategory', 'delete'))

    // 2. Verificar que a categoria pertence à org
    const category = await db.serviceCategory.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, _count: { select: { services: true } } },
    })

    if (!category) {
      throw new Error('Categoria não encontrada.')
    }

    // 3. Bloquear deleção se há serviços vinculados (evitar orfãos)
    if (category._count.services > 0) {
      throw new Error(
        `Não é possível excluir a categoria pois há ${category._count.services} serviço(s) vinculado(s). Mova ou exclua os serviços primeiro.`,
      )
    }

    // 4. Deletar a categoria
    await db.serviceCategory.delete({ where: { id: data.id } })

    // 5. Invalidar cache
    revalidateTag(`service-categories:${ctx.orgId}`)
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true }
  })
