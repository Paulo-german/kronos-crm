import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { AppointmentDto } from './get-appointments'

const fetchDealAppointmentsFromDb = async (
  dealId: string,
  orgId: string,
): Promise<AppointmentDto[]> => {
  const appointments = await db.appointment.findMany({
    where: {
      dealId,
      organizationId: orgId,
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
      user: {
        select: { fullName: true },
      },
      dealId: true,
      deal: {
        select: { title: true },
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
 * Busca agendamentos de um deal específico (Cacheado)
 * Sem RBAC de ownership — acesso ao deal já foi verificado antes
 */
export const getDealAppointments = async (
  dealId: string,
  orgId: string,
): Promise<AppointmentDto[]> => {
  const getCached = unstable_cache(
    async () => fetchDealAppointmentsFromDb(dealId, orgId),
    [`deal-appointments-${dealId}`],
    {
      tags: [`appointments:${orgId}`, `deal-appointments:${dealId}`],
    },
  )

  return getCached()
}
