import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { AppointmentsCalendarClient } from '../_components/appointments-calendar-client'

interface AppointmentsCalendarPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsCalendarPage = async ({
  params,
}: AppointmentsCalendarPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [appointments, dealOptions, members] = await Promise.all([
    getAppointments(ctx),
    getDealsOptions(ctx),
    getOrganizationMembers(ctx.orgId),
  ])

  return (
    <AppointmentsCalendarClient
      appointments={appointments}
      dealOptions={dealOptions}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
    />
  )
}

export default AppointmentsCalendarPage
