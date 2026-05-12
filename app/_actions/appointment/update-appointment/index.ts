'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { updateAppointmentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import {
  canPerformAction,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
  findAppointmentWithRBAC,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'

export const updateAppointment = orgActionClient
  .schema(updateAppointmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base
    requirePermission(canPerformAction(ctx, 'appointment', 'update'))

    // 2. Buscar agendamento existente — inclui type e professionalId para overlap condicional
    const existing = await findAppointmentWithRBAC(data.id, ctx)

    // 3. Bloqueio de status: não permite editar agendamentos finalizados
    const lockedStatuses = ['COMPLETED', 'CANCELED', 'NO_SHOW'] as const
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

    // 5. Overlapping check diferenciado por type (MEETING vs BOOKING)
    const effectiveAssignedTo = data.assignedTo ?? existing.assignedTo
    const effectiveStartDate = data.startDate
    const effectiveEndDate = data.endDate

    if (
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.assignedTo !== undefined ||
      data.professionalId !== undefined
    ) {
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
        if (existing.type === 'BOOKING') {
          // Overlap por professionalId — usa o novo professionalId se estiver sendo alterado,
          // senão usa o profissional existente do agendamento
          const effectiveProfessionalId = data.professionalId ?? existing.professionalId

          if (effectiveProfessionalId) {
            const overlapping = await db.appointment.findFirst({
              where: {
                id: { not: data.id },
                professionalId: effectiveProfessionalId,
                organizationId: ctx.orgId,
                status: { notIn: ['CANCELED', 'NO_SHOW'] },
                startDate: { lt: endForCheck },
                endDate: { gt: startForCheck },
              },
              select: { id: true },
            })

            if (overlapping) {
              throw new Error('Profissional já possui um agendamento neste período.')
            }
          }
        } else {
          // MEETING: overlap por assignedTo — NULL = NULL é FALSE em SQL,
          // então usar professionalId (null) invalidaria o check para MEETING
          const overlapping = await db.appointment.findFirst({
            where: {
              id: { not: data.id },
              assignedTo: effectiveAssignedTo,
              organizationId: ctx.orgId,
              type: 'MEETING',
              status: { notIn: ['CANCELED', 'NO_SHOW'] },
              startDate: { lt: endForCheck },
              endDate: { gt: startForCheck },
            },
            select: { id: true },
          })

          if (overlapping) {
            throw new Error('O responsável já possui um agendamento neste período.')
          }
        }
      }
    }

    // 6. Build update data com conditional spread
    const updateData: Prisma.AppointmentUpdateInput = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.contactId !== undefined ? { contactId: data.contactId } : {}),
      ...(data.professionalId !== undefined ? { professionalId: data.professionalId } : {}),
      ...(data.serviceId !== undefined ? { serviceId: data.serviceId } : {}),
    }

    await db.appointment.update({
      where: { id: data.id },
      data: updateData,
    })

    // 7. Activity se status mudou — apenas para MEETING (dealId obrigatório para Activity)
    if (data.status !== undefined && data.status !== existing.status && existing.dealId) {
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

    // 8. Invalidar cache — inclui professional-appointments quando aplicável
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    if (existing.dealId) {
      revalidateTag(`deal-appointments:${existing.dealId}`)
      revalidateTag(`deal:${existing.dealId}`)
    }
    const effectiveProfessionalId = data.professionalId ?? existing.professionalId
    if (effectiveProfessionalId) {
      revalidateTag(`professional-appointments:${effectiveProfessionalId}`)
    }

    // Notificar novo responsável quando há transferência de ownership para outro usuário
    if (
      isOwnershipChange(data.assignedTo, existing.assignedTo) &&
      data.assignedTo !== undefined &&
      data.assignedTo !== ctx.userId
    ) {
      const newAssignedTo = data.assignedTo
      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: newAssignedTo,
          type: 'USER_ACTION',
          title: 'Agendamento transferido para você',
          body: `O agendamento "${existing.title}" foi transferido para você.`,
          actionUrl: `/org/${slug}/crm/appointments`,
          resourceType: 'appointment',
          resourceId: data.id,
        })
      })
    }

    return { success: true }
  })
