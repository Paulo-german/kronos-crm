'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteProfessional = orgActionClient
  .schema(deleteProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base (apenas OWNER/ADMIN)
    requirePermission(canPerformAction(ctx, 'professional', 'delete'))

    // 2. Verificar que o profissional pertence à org
    const professional = await db.professional.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, userId: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Deletar o profissional (cascade automático: workingHours, exceptions, professionalServices)
    await db.professional.delete({ where: { id: data.id } })

    // 4. Invalidar cache da listagem e do detalhe
    revalidateTag(`professionals:${ctx.orgId}`)
    revalidateTag(`professional:${data.id}`)

    return { success: true }
  })
