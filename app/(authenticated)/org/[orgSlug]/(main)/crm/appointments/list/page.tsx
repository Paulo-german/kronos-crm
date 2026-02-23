import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAppointments } from '@/_data-access/appointment/get-appointments'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import AppointmentsDataTable from '../_components/appointments-data-table'
import CreateAppointmentButton from '../_components/create-appointment-button'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

interface AppointmentsListPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsListPage = async ({ params }: AppointmentsListPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [appointments, dealOptions, members] = await Promise.all([
    getAppointments(ctx),
    getDealsOptions(ctx),
    getOrganizationMembers(ctx.orgId),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Agendamentos</HeaderTitle>
          <HeaderSubTitle>
            Gerencie seus agendamentos e compromissos
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateAppointmentButton
            dealOptions={dealOptions}
            members={members.accepted}
          />
        </HeaderRight>
      </Header>
      <AppointmentsDataTable
        appointments={appointments}
        dealOptions={dealOptions}
        members={members.accepted}
      />
    </div>
  )
}

export default AppointmentsListPage
