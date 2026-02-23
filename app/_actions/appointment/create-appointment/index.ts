'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createAppointmentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
  findDealWithRBAC,
} from '@/_lib/rbac'

export const createAppointment = orgActionClient
  .schema(createAppointmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base
    requirePermission(canPerformAction(ctx, 'appointment', 'create'))

    // 2. Sem quota (appointments não têm limite de plano)

    // 3. Ownership: MEMBER forçado para si mesmo
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Cross-entity: verificar se deal existe e pertence à org
    await findDealWithRBAC(data.dealId, ctx)

    // 5. Overlapping check: verificar conflito de horário
    const overlapping = await db.appointment.findFirst({
      where: {
        assignedTo,
        organizationId: ctx.orgId,
        status: { not: 'CANCELED' },
        startDate: { lt: data.endDate },
        endDate: { gt: data.startDate },
      },
      select: { id: true },
    })

    if (overlapping) {
      throw new Error('O responsável já possui um agendamento neste período.')
    }

    // 6. Criar agendamento
    await db.appointment.create({
      data: {
        organizationId: ctx.orgId,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        assignedTo,
        dealId: data.dealId,
      },
    })

    // 7. Activity na timeline do deal
    await db.activity.create({
      data: {
        type: 'appointment_created',
        content: data.title,
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    // 8. Invalidar cache
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deal-appointments:${data.dealId}`)
    revalidateTag(`deal:${data.dealId}`)

    return { success: true }
  })
