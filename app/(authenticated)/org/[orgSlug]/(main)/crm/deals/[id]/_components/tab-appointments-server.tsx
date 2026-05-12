import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getDealAppointments } from '@/_data-access/appointment/get-deal-appointments'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import TabAppointments from './tab-appointments'

interface TabAppointmentsServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
  members: AcceptedMemberDto[]
}

const TabAppointmentsServer = async ({
  deal,
  ctx,
  members,
}: TabAppointmentsServerProps) => {
  const [appointments, contactOptions, allAppointments] = await Promise.all([
    getDealAppointments(deal.id, ctx.orgId),
    getContactsOptions(ctx),
    getAppointments(ctx),
  ])

  const linkableAppointments = allAppointments.filter(
    (appt) => appt.dealId === null,
  )

  return (
    <TabAppointments
      deal={deal}
      appointments={appointments}
      members={members}
      contactOptions={contactOptions}
      services={[]}
      linkableAppointments={linkableAppointments}
    />
  )
}

export default TabAppointmentsServer
