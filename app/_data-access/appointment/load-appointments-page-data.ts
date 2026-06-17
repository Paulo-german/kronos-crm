import 'server-only'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { getServices } from '@/_data-access/service/get-services'

/**
 * Carrega o conjunto de dados comum às visões de agendamento (lista e
 * calendário mês/semana/dia). Centraliza o Promise.all que era repetido em
 * cada Server Component de página.
 */
export const loadAppointmentsPageData = async (orgSlug: string) => {
  const ctx = await getOrgContext(orgSlug)

  const [appointments, members, contactOptions, services] = await Promise.all([
    getAppointments(ctx),
    getOrganizationMembers(ctx.orgId),
    getContactsOptions(ctx),
    getServices(ctx.orgId, false),
  ])

  return {
    appointments,
    members: members.accepted,
    currentUserId: ctx.userId,
    userRole: ctx.userRole,
    contactOptions,
    services,
    orgSlug,
  }
}
