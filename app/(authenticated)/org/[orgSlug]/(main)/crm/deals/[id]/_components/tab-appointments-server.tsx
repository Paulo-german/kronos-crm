import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getDealAppointments } from '@/_data-access/appointment/get-deal-appointments'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
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
  const [appointments, dealOptions] = await Promise.all([
    getDealAppointments(deal.id, ctx.orgId),
    getDealsOptions(ctx),
  ])

  return (
    <TabAppointments
      deal={deal}
      appointments={appointments}
      members={members}
      dealOptions={dealOptions}
    />
  )
}

export default TabAppointmentsServer
