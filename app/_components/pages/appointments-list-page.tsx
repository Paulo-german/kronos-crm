import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { getServices } from '@/_data-access/service/get-services'
import { AppointmentsListClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/appointments/_components/appointments-list-client'

interface AppointmentsListPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsListPage = async ({ params }: AppointmentsListPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [appointments, members, contactOptions, services] = await Promise.all([
    getAppointments(ctx),
    getOrganizationMembers(ctx.orgId),
    getContactsOptions(ctx),
    getServices(ctx.orgId, false),
  ])

  return (
    <AppointmentsListClient
      appointments={appointments}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      contactOptions={contactOptions}
      services={services}
      orgSlug={orgSlug}
    />
  )
}

export default AppointmentsListPage
