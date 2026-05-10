import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getDealAppointments } from '@/_data-access/appointment/get-deal-appointments'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
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
  const [appointments, contactOptions] = await Promise.all([
    getDealAppointments(deal.id, ctx.orgId),
    getContactsOptions(ctx),
  ])

  return (
    <TabAppointments
      deal={deal}
      appointments={appointments}
      members={members}
      contactOptions={contactOptions}
      services={[]}
    />
  )
}

export default TabAppointmentsServer
