'use server'

import { after } from 'next/server'
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
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { timeToMinutes } from '@/_data-access/professional/slot-utils'

export const createAppointment = orgActionClient
  .schema(createAppointmentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão base
    requirePermission(canPerformAction(ctx, 'appointment', 'create'))

    // 2. Sem quota (appointments não têm limite de plano)

    // 3. Ownership: MEMBER forçado para si mesmo
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Cross-entity: deal apenas para MEETING
    if (data.type === 'MEETING' && data.dealId) {
      await findDealWithRBAC(data.dealId, ctx)
    }

    // 5. Validações específicas de BOOKING e cálculo de endDate
    // Para MEETING, endDate vem do input validado pelo schema (superRefine garante presença)
    if (data.type === 'MEETING' && !data.endDate) {
      throw new Error('Data de fim é obrigatória para agendamentos comerciais.')
    }

    let computedEndDate: Date = data.endDate ?? new Date()

    if (data.type === 'BOOKING') {
      // 5a. Garantir que professionalId e serviceId estão presentes (já validado no schema, mas narrowing para TS)
      if (!data.professionalId || !data.serviceId) {
        throw new Error('professionalId e serviceId são obrigatórios para BOOKING.')
      }

      const professionalId = data.professionalId
      const serviceId = data.serviceId

      // 5b. Profissional ativo pertencente à org
      const professional = await db.professional.findFirst({
        where: { id: professionalId, organizationId: ctx.orgId, isActive: true },
        select: { id: true, userId: true },
      })
      if (!professional) {
        throw new Error('Profissional não encontrado ou inativo.')
      }

      // 5c. Serviço ativo pertencente à org — busca inclui price para reutilizar como priceSnapshot
      const service = await db.service.findFirst({
        where: { id: serviceId, organizationId: ctx.orgId, isActive: true },
        select: { id: true, duration: true, price: true },
      })
      if (!service) {
        throw new Error('Serviço não encontrado ou inativo.')
      }

      // 5d. Verificar que o profissional executa este serviço
      const link = await db.professionalService.findUnique({
        where: { professionalId_serviceId: { professionalId, serviceId } },
        select: { professionalId: true },
      })
      if (!link) {
        throw new Error('Profissional não executa este serviço.')
      }

      // 5e. Verificar que startDate está dentro da jornada efetiva do profissional
      // Usa UTC para evitar drift de timezone — horários no banco são armazenados como "HH:mm" string
      const dayOfWeek = data.startDate.getUTCDay()
      const exception = await db.workingHoursException.findFirst({
        where: { professionalId, date: data.startDate },
        select: { type: true, startTime: true, endTime: true },
      })

      if (exception?.type === 'OFF') {
        throw new Error('Profissional não trabalha nesta data.')
      }

      let workStart: string
      let workEnd: string

      if (
        exception?.type === 'CUSTOM_HOURS' &&
        exception.startTime &&
        exception.endTime
      ) {
        workStart = exception.startTime
        workEnd = exception.endTime
      } else {
        const workingHours = await db.workingHours.findFirst({
          where: { professionalId, dayOfWeek },
          select: { startTime: true, endTime: true },
        })
        if (!workingHours) {
          throw new Error('Profissional não trabalha neste dia da semana.')
        }
        workStart = workingHours.startTime
        workEnd = workingHours.endTime
      }

      const startMinutes = data.startDate.getUTCHours() * 60 + data.startDate.getUTCMinutes()
      const endMinutes = startMinutes + service.duration

      if (
        startMinutes < timeToMinutes(workStart) ||
        endMinutes > timeToMinutes(workEnd)
      ) {
        throw new Error('Horário fora da jornada do profissional.')
      }

      // 5f. Calcular endDate a partir da duração do serviço (em minutos)
      computedEndDate = new Date(data.startDate.getTime() + service.duration * 60 * 1000)

      // 6. Overlap check por professionalId para BOOKING
      // NULL = NULL é FALSE em SQL, então usar professionalId em overlap de MEETING
      // silenciaria o check — por isso o overlap é condicional por type
      const overlapping = await db.appointment.findFirst({
        where: {
          professionalId,
          organizationId: ctx.orgId,
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          startDate: { lt: computedEndDate },
          endDate: { gt: data.startDate },
        },
        select: { id: true },
      })

      if (overlapping) {
        throw new Error('Profissional já possui um agendamento neste período.')
      }

      // 7. Criar agendamento BOOKING com priceSnapshot reutilizando a query do step 5c
      const appointment = await db.appointment.create({
        data: {
          organizationId: ctx.orgId,
          type: data.type,
          contactId: data.contactId,
          title: data.title,
          description: data.description,
          notes: data.notes,
          startDate: data.startDate,
          endDate: computedEndDate,
          assignedTo,
          dealId: null,
          professionalId,
          serviceId,
          priceSnapshot: service.price,
        },
      })

      // 8. BOOKING não gera Activity — sem dealId para registrar no timeline
      // Activity própria de serviços planejada para v2

      // 9. Invalidar cache
      revalidateTag(`appointments:${ctx.orgId}`)
      revalidateTag(`professional-appointments:${professionalId}`)

      if (assignedTo !== ctx.userId) {
        after(async () => {
          const slug = await getOrgSlug(ctx.orgId)
          await createNotification({
            orgId: ctx.orgId,
            userId: assignedTo,
            type: 'USER_ACTION',
            title: 'Novo agendamento atribuído a você',
            body: `O agendamento "${data.title}" foi atribuído a você.`,
            actionUrl: `/org/${slug}/crm/appointments`,
            resourceType: 'appointment',
            resourceId: appointment.id,
          })
        })
      }

      return { success: true }
    }

    // Fluxo MEETING: overlap por assignedTo (comportamento legado preservado)
    // computedEndDate já possui o valor de data.endDate (garantido pelo guard acima)
    const overlapping = await db.appointment.findFirst({
      where: {
        assignedTo,
        organizationId: ctx.orgId,
        type: 'MEETING',
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        startDate: { lt: computedEndDate },
        endDate: { gt: data.startDate },
      },
      select: { id: true },
    })

    if (overlapping) {
      throw new Error('O responsável já possui um agendamento neste período.')
    }

    const appointment = await db.appointment.create({
      data: {
        organizationId: ctx.orgId,
        type: data.type,
        contactId: data.contactId,
        title: data.title,
        description: data.description,
        notes: data.notes,
        startDate: data.startDate,
        endDate: computedEndDate,
        assignedTo,
        dealId: data.dealId ?? null,
        professionalId: null,
        serviceId: null,
        priceSnapshot: null,
      },
    })

    // Activity na timeline do deal — apenas MEETING com dealId
    if (data.dealId) {
      await db.activity.create({
        data: {
          type: 'appointment_created',
          content: data.title,
          dealId: data.dealId,
          performedBy: ctx.userId,
        },
      })
    }

    // Invalidar cache MEETING
    revalidateTag(`appointments:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    if (data.dealId) {
      revalidateTag(`deal-appointments:${data.dealId}`)
      revalidateTag(`deal:${data.dealId}`)
    }

    if (assignedTo !== ctx.userId) {
      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: assignedTo,
          type: 'USER_ACTION',
          title: 'Novo agendamento atribuído a você',
          body: `O agendamento "${data.title}" foi atribuído a você.`,
          actionUrl: `/org/${slug}/crm/appointments`,
          resourceType: 'appointment',
          resourceId: appointment.id,
        })
      })
    }

    return { success: true }
  })
