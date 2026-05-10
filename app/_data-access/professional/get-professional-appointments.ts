import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { AppointmentStatus, AppointmentType, PaymentStatus } from '@prisma/client'

export interface ProfessionalAppointmentDto {
  id: string
  title: string
  description: string | null
  notes: string | null
  startDate: Date
  endDate: Date
  status: AppointmentStatus
  type: AppointmentType
  priceSnapshot: string | null
  paymentStatus: PaymentStatus | null
  serviceId: string | null
  service: { id: string; name: string; duration: number } | null
  contactId: string | null
  contact: { id: string; name: string; phone: string | null } | null
  createdAt: Date
  updatedAt: Date
}

const fetchProfessionalAppointmentsFromDb = async (
  professionalId: string,
  orgId: string,
): Promise<ProfessionalAppointmentDto[]> => {
  const appointments = await db.appointment.findMany({
    where: {
      professionalId,
      organizationId: orgId,
    },
    include: {
      service: {
        select: { id: true, name: true, duration: true },
      },
      contact: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { startDate: 'asc' },
  })

  return appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    notes: appointment.notes,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    status: appointment.status,
    type: appointment.type,
    priceSnapshot: appointment.priceSnapshot?.toString() ?? null,
    paymentStatus: appointment.paymentStatus,
    serviceId: appointment.serviceId,
    service: appointment.service,
    contactId: appointment.contactId,
    contact: appointment.contact,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }))
}

/**
 * Lista agendamentos de um profissional (Cacheado)
 */
export const getProfessionalAppointments = cache(async (
  professionalId: string,
  orgId: string,
): Promise<ProfessionalAppointmentDto[]> => {
  const getCached = unstable_cache(
    async () => fetchProfessionalAppointmentsFromDb(professionalId, orgId),
    [`professional-appointments-${professionalId}-${orgId}`],
    {
      tags: [`professional-appointments:${professionalId}`],
      revalidate: 300,
    },
  )

  return getCached()
})
