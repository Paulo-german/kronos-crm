'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { setWorkingHoursSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const setWorkingHours = orgActionClient
  .schema(setWorkingHoursSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'workingHours', 'update'))

    // 2. Verificar que o profissional pertence à org
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Upsert — cria a entrada se não existir, atualiza se já existir
    await db.workingHours.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: data.professionalId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      create: {
        organizationId: ctx.orgId,
        professionalId: data.professionalId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
      },
    })

    // 4. Invalidar cache da jornada e do detalhe do profissional
    revalidateTag(`working-hours:${data.professionalId}`)
    revalidateTag(`professional:${data.professionalId}`)

    return { success: true }
  })
