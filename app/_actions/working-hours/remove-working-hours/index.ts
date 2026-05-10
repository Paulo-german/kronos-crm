'use server'

import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { orgActionClient } from '@/_lib/safe-action'
import { removeWorkingHoursSchema } from './schema'

export const removeWorkingHours = orgActionClient
  .schema(removeWorkingHoursSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'workingHours', 'delete'))

    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    await db.workingHours.deleteMany({
      where: {
        professionalId: data.professionalId,
        dayOfWeek: data.dayOfWeek,
        organizationId: ctx.orgId,
      },
    })

    revalidateTag(`working-hours:${data.professionalId}`)
    revalidateTag(`professional:${data.professionalId}`)

    return { success: true }
  })
