'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteAppointmentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  findAppointmentWithRBAC,
} from '@/_lib/rbac'

export const deleteAppointment = orgActionClient
  .schema(deleteAppointmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base
    requirePermission(canPerformAction(ctx, 'appointment', 'delete'))

    // 2. Buscar agendamento existente
    const existing = await findAppointmentWithRBAC(data.id, ctx)

    // 3. Bloqueio: só pode excluir agendamentos cancelados
    if (existing.status !== 'CANCELED') {
      throw new Error('Apenas agendamentos cancelados podem ser excluídos.')
    }

    // 4. Registrar atividade antes de deletar
    await db.activity.create({
      data: {
        type: 'appointment_deleted',
        content: existing.title,
        dealId: existing.dealId,
        performedBy: ctx.userId,
      },
    })

    // 5. Deletar
    await db.appointment.delete({
      where: { id: data.id },
    })

    // 6. Invalidar cache
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deal-appointments:${existing.dealId}`)
    revalidateTag(`deal:${existing.dealId}`)

    return { success: true }
  })
