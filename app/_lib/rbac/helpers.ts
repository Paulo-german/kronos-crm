import { db } from '@/_lib/prisma'
import type { AppointmentStatus } from '@prisma/client'
import type { PermissionContext } from './types'
import { canAccessRecord, requirePermission } from './guards'

/**
 * Busca um deal e verifica se o usuário tem permissão de acesso
 * Retorna o deal se encontrado e permitido, lança erro caso contrário
 */
export async function findDealWithRBAC(
  dealId: string,
  ctx: PermissionContext
): Promise<{ id: string; assignedTo: string; pipelineStageId: string }> {
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      organizationId: ctx.orgId,
    },
    select: {
      id: true,
      assignedTo: true,
      pipelineStageId: true,
    },
  })

  if (!deal) {
    throw new Error('Negócio não encontrado.')
  }

  // Verifica acesso RBAC (MEMBER só acessa próprios)
  requirePermission(canAccessRecord(ctx, { assignedTo: deal.assignedTo }))

  return deal
}

/**
 * Busca uma task e verifica se o usuário tem permissão de acesso
 * Retorna a task se encontrada e permitida, lança erro caso contrário
 */
export async function findTaskWithRBAC(
  taskId: string,
  ctx: PermissionContext
): Promise<{ id: string; assignedTo: string; dealId: string | null; isCompleted: boolean }> {
  const task = await db.task.findFirst({
    where: {
      id: taskId,
      organizationId: ctx.orgId,
    },
    select: {
      id: true,
      assignedTo: true,
      dealId: true,
      isCompleted: true,
    },
  })

  if (!task) {
    throw new Error('Tarefa não encontrada.')
  }

  // Verifica acesso RBAC (MEMBER só acessa próprias)
  requirePermission(canAccessRecord(ctx, { assignedTo: task.assignedTo }))

  return task
}

/**
 * Busca um contato e verifica se o usuário tem permissão de acesso
 * Retorna o contato se encontrado e permitido, lança erro caso contrário
 */
export async function findContactWithRBAC(
  contactId: string,
  ctx: PermissionContext
): Promise<{ id: string; assignedTo: string | null; name: string }> {
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      organizationId: ctx.orgId,
    },
    select: {
      id: true,
      assignedTo: true,
      name: true,
    },
  })

  if (!contact) {
    throw new Error('Contato não encontrado.')
  }

  // Verifica acesso RBAC (MEMBER só acessa próprios)
  requirePermission(canAccessRecord(ctx, { assignedTo: contact.assignedTo }))

  return contact
}

/**
 * Busca um agendamento e verifica se o usuário tem permissão de acesso
 * Retorna o agendamento se encontrado e permitido, lança erro caso contrário
 */
export async function findAppointmentWithRBAC(
  appointmentId: string,
  ctx: PermissionContext
): Promise<{ id: string; assignedTo: string; dealId: string; status: AppointmentStatus; title: string }> {
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.orgId,
    },
    select: {
      id: true,
      assignedTo: true,
      dealId: true,
      status: true,
      title: true,
    },
  })

  if (!appointment) {
    throw new Error('Agendamento não encontrado.')
  }

  // Verifica acesso RBAC (MEMBER só acessa próprios)
  requirePermission(canAccessRecord(ctx, { assignedTo: appointment.assignedTo }))

  return appointment
}
