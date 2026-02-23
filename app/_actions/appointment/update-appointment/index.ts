'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateAppointmentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
  findAppointmentWithRBAC,
} from '@/_lib/rbac'

export const updateAppointment = orgActionClient
  .schema(updateAppointmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base
    requirePermission(canPerformAction(ctx, 'appointment', 'update'))

    // 2. Buscar agendamento existente
    const existing = await findAppointmentWithRBAC(data.id, ctx)

    // 3. Bloqueio de status: não permite editar agendamentos finalizados
    const lockedStatuses = ['IN_PROGRESS', 'COMPLETED', 'CANCELED'] as const
    const isLocked = lockedStatuses.some((status) => status === existing.status)

    if (isLocked) {
      // Exceção: permite mudar apenas o status se for uma transição válida
      const isOnlyStatusChange =
        data.status !== undefined &&
        Object.keys(data).filter((key) => key !== 'id' && data[key as keyof typeof data] !== undefined).length === 1

      if (!isOnlyStatusChange) {
        throw new Error(
          'Não é possível editar um agendamento finalizado. Altere o status primeiro.',
        )
      }
    }

    // 4. Transfer check se mudou assignedTo
    if (isOwnershipChange(data.assignedTo, existing.assignedTo)) {
      requirePermission(canTransferOwnership(ctx))
    }

    // 5. Overlapping check se datas ou assignedTo mudaram
    const effectiveAssignedTo = data.assignedTo ?? existing.assignedTo
    const effectiveStartDate = data.startDate
    const effectiveEndDate = data.endDate

    if (
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.assignedTo !== undefined
    ) {
      // Precisamos das datas completas para o check — buscar do banco se não fornecidas
      let startForCheck = effectiveStartDate
      let endForCheck = effectiveEndDate

      if (!startForCheck || !endForCheck) {
        const full = await db.appointment.findUnique({
          where: { id: data.id },
          select: { startDate: true, endDate: true },
        })
        if (full) {
          startForCheck = startForCheck ?? full.startDate
          endForCheck = endForCheck ?? full.endDate
        }
      }

      if (startForCheck && endForCheck) {
        const overlapping = await db.appointment.findFirst({
          where: {
            id: { not: data.id },
            assignedTo: effectiveAssignedTo,
            organizationId: ctx.orgId,
            status: { not: 'CANCELED' },
            startDate: { lt: endForCheck },
            endDate: { gt: startForCheck },
          },
          select: { id: true },
        })

        if (overlapping) {
          throw new Error(
            'O responsável já possui um agendamento neste período.',
          )
        }
      }
    }

    // 6. Build update data com conditional spread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.startDate !== undefined) updateData.startDate = data.startDate
    if (data.endDate !== undefined) updateData.endDate = data.endDate
    if (data.status !== undefined) updateData.status = data.status
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo

    await db.appointment.update({
      where: { id: data.id },
      data: updateData,
    })

    // 7. Activity se status mudou
    if (data.status !== undefined && data.status !== existing.status) {
      const activityType =
        data.status === 'CANCELED' ? 'appointment_canceled' : 'appointment_updated'

      await db.activity.create({
        data: {
          type: activityType,
          content: `Status alterado para ${data.status}`,
          dealId: existing.dealId,
          performedBy: ctx.userId,
        },
      })
    }

    // 8. Invalidar cache
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deal-appointments:${existing.dealId}`)
    revalidateTag(`deal:${existing.dealId}`)

    return { success: true }
  })
