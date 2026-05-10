'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteServiceSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteService = orgActionClient
  .schema(deleteServiceSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas OWNER/ADMIN)
    requirePermission(canPerformAction(ctx, 'service', 'delete'))

    // 2. Verificar que o serviço pertence à org
    const service = await db.service.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!service) {
      throw new Error('Serviço não encontrado.')
    }

    // 3. Deletar o serviço (cascade: professionalServices; appointments setNull via schema)
    await db.service.delete({ where: { id: data.id } })

    // 4. Invalidar cache
    revalidateTag(`services:${ctx.orgId}`)
    revalidateTag(`service:${data.id}`)

    return { success: true }
  })
