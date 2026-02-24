import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getDealAppointments } from '@/_data-access/appointment/get-deal-appointments'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import TabAppointments from './tab-appointments'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface TabAppointmentsServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
  members: MemberDto[]
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
