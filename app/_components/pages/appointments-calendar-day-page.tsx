import { loadAppointmentsPageData } from '@/_data-access/appointment/load-appointments-page-data'
import { AppointmentsCalendarClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/appointments/_components/appointments-calendar-client'

interface AppointmentsCalendarDayPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsCalendarDayPage = async ({
  params,
}: AppointmentsCalendarDayPageProps) => {
  const { orgSlug } = await params
  const data = await loadAppointmentsPageData(orgSlug)

  return (
    <AppointmentsCalendarClient
      appointments={data.appointments}
      members={data.members}
      currentUserId={data.currentUserId}
      userRole={data.userRole}
      contactOptions={data.contactOptions}
      services={data.services}
      granularity="day"
    />
  )
}

export default AppointmentsCalendarDayPage
