'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { bulkSetWorkingHoursSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const bulkSetWorkingHours = orgActionClient
  .schema(bulkSetWorkingHoursSchema)
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

    // 3. Separar os dias habilitados para criação
    const enabledDays = data.days.filter((day) => day.enabled)

    // 4. Substituição atômica: deletar todos os existentes e recriar apenas os habilitados
    await db.$transaction([
      db.workingHours.deleteMany({
        where: { professionalId: data.professionalId, organizationId: ctx.orgId },
      }),
      db.workingHours.createMany({
        data: enabledDays.map((day) => ({
          organizationId: ctx.orgId,
          professionalId: data.professionalId,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
        })),
      }),
    ])

    // 5. Invalidar cache da jornada e do detalhe do profissional
    revalidateTag(`working-hours:${data.professionalId}`)
    revalidateTag(`professional:${data.professionalId}`)

    return { success: true }
  })
