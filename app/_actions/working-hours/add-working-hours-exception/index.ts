'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { addWorkingHoursExceptionSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const addWorkingHoursException = orgActionClient
  .schema(addWorkingHoursExceptionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'workingHours', 'create'))

    // 2. Verificar que o profissional pertence à org
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Verificar que não há exceção para esta data (unique constraint [professionalId, date])
    const existing = await db.workingHoursException.findUnique({
      where: {
        professionalId_date: {
          professionalId: data.professionalId,
          date: data.date,
        },
      },
      select: { id: true },
    })

    if (existing) {
      throw new Error('Já existe uma exceção cadastrada para esta data. Remova a existente primeiro.')
    }

    // 4. Criar a exceção
    await db.workingHoursException.create({
      data: {
        organizationId: ctx.orgId,
        professionalId: data.professionalId,
        date: data.date,
        type: data.type,
        startTime: data.type === 'CUSTOM_HOURS' ? data.startTime ?? null : null,
        endTime: data.type === 'CUSTOM_HOURS' ? data.endTime ?? null : null,
      },
    })

    // 5. Invalidar cache
    revalidateTag(`working-hours:${data.professionalId}`)
    revalidateTag(`professional:${data.professionalId}`)

    return { success: true }
  })
