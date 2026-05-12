'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import {
  canPerformAction,
  requirePermission,
  findAppointmentWithRBAC,
  findDealWithRBAC,
} from '@/_lib/rbac'
import { linkAppointmentToDealSchema } from './schema'

export const linkAppointmentToDeal = orgActionClient
  .schema(linkAppointmentToDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    await findAppointmentWithRBAC(data.appointmentId, ctx)
    await findDealWithRBAC(data.dealId, ctx)

    await db.appointment.update({
      where: { id: data.appointmentId },
      data: { dealId: data.dealId },
    })

    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deal-appointments:${data.dealId}`)

    return { success: true }
  })
