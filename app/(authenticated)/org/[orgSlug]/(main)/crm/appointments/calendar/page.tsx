import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { getServices } from '@/_data-access/service/get-services'
import { AppointmentsCalendarClient } from '../_components/appointments-calendar-client'

interface AppointmentsCalendarPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsCalendarPage = async ({
  params,
}: AppointmentsCalendarPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [appointments, members, contactOptions, services] = await Promise.all([
    getAppointments(ctx),
    getOrganizationMembers(ctx.orgId),
    getContactsOptions(ctx),
    getServices(ctx.orgId, false),
  ])

  return (
    <AppointmentsCalendarClient
      appointments={appointments}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      contactOptions={contactOptions}
      services={services}
    />
  )
}

export default AppointmentsCalendarPage
