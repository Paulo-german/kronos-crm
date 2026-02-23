import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { AppointmentStatus } from '@prisma/client'

export interface AppointmentDto {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  status: AppointmentStatus
  assignedTo: string
  assigneeName: string | null
  dealId: string
  dealTitle: string
  createdAt: Date
  updatedAt: Date
}

const fetchAppointmentsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<AppointmentDto[]> => {
  const appointments = await db.appointment.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      assignedTo: true,
      dealId: true,
      deal: {
        select: { title: true },
      },
      user: {
        select: { fullName: true },
      },
      createdAt: true,
      updatedAt: true,
    },
  })

  return appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    status: appointment.status,
    assignedTo: appointment.assignedTo,
    assigneeName: appointment.user?.fullName ?? null,
    dealId: appointment.dealId,
    dealTitle: appointment.deal.title,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }))
}

/**
 * Busca todos os agendamentos da organização (Cacheado)
 * RBAC: MEMBER só vê agendamentos atribuídos a ele
 */
export const getAppointments = async (
  ctx: RBACContext,
): Promise<AppointmentDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchAppointmentsFromDb(ctx.orgId, ctx.userId, elevated),
    [`appointments-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`appointments:${ctx.orgId}`],
    },
  )

  return getCached()
}
