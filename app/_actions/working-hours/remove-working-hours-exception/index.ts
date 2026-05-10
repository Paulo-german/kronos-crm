'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeWorkingHoursExceptionSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const removeWorkingHoursException = orgActionClient
  .schema(removeWorkingHoursExceptionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'workingHours', 'delete'))

    // 2. Verificar que a exceção existe e pertence ao profissional e org correta
    const exception = await db.workingHoursException.findFirst({
      where: {
        id: data.id,
        professionalId: data.professionalId,
        organizationId: ctx.orgId,
      },
      select: { id: true },
    })

    if (!exception) {
      throw new Error('Exceção não encontrada.')
    }

    // 3. Remover a exceção
    await db.workingHoursException.delete({ where: { id: data.id } })

    // 4. Invalidar cache
    revalidateTag(`working-hours:${data.professionalId}`)
    revalidateTag(`professional:${data.professionalId}`)

    return { success: true }
  })
