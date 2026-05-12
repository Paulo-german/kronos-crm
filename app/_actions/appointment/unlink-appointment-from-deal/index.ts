'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import {
  canPerformAction,
  requirePermission,
  findAppointmentWithRBAC,
} from '@/_lib/rbac'
import { unlinkAppointmentFromDealSchema } from './schema'

export const unlinkAppointmentFromDeal = orgActionClient
  .schema(unlinkAppointmentFromDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    const appointment = await findAppointmentWithRBAC(data.appointmentId, ctx)

    if (appointment.dealId === null) {
      throw new Error('Este agendamento não está vinculado a nenhum negócio.')
    }

    const previousDealId = appointment.dealId

    await db.appointment.update({
      where: { id: data.appointmentId },
      data: { dealId: null },
    })

    revalidateTag(`deal:${previousDealId}`)
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deal-appointments:${previousDealId}`)

    return { success: true }
  })
