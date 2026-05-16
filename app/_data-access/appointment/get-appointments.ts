import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { AppointmentStatus, AppointmentType, DealStatus } from '@prisma/client'

export interface AppointmentDto {
  id: string
  type: AppointmentType
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  status: AppointmentStatus
  assignedTo: string
  assigneeName: string | null
  // contactId é obrigatório para ambos os tipos (pode ser null em registros legados pré-backfill)
  contactId: string | null
  // dealId é opcional desde a Fase A do scheduling v2 (SERVICE appointments não têm deal)
  dealId: string | null
  dealTitle: string | null
  dealStatus: DealStatus | null
  professionalId: string | null
  serviceId: string | null
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
      type: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      status: true,
      assignedTo: true,
      contactId: true,
      dealId: true,
      professionalId: true,
      serviceId: true,
      deal: {
        select: { title: true, status: true },
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
    type: appointment.type,
    title: appointment.title,
    description: appointment.description,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    status: appointment.status,
    assignedTo: appointment.assignedTo,
    assigneeName: appointment.user?.fullName ?? null,
    contactId: appointment.contactId,
    dealId: appointment.dealId,
    dealTitle: appointment.deal?.title ?? null,
    dealStatus: appointment.deal?.status ?? null,
    professionalId: appointment.professionalId,
    serviceId: appointment.serviceId,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }))
}

/**
 * Busca todos os agendamentos da organização (Cacheado)
 * RBAC: MEMBER só vê agendamentos atribuídos a ele
 */
export const getAppointments = cache(async (
  ctx: RBACContext,
): Promise<AppointmentDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchAppointmentsFromDb(ctx.orgId, ctx.userId, elevated),
    [`appointments-${ctx.orgId}-${ctx.userId}-${elevated}`],
    {
      tags: [`appointments:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})
