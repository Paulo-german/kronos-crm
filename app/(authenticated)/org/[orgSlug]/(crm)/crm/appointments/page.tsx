import { redirect } from 'next/navigation'

interface AppointmentsPageProps {
  params: Promise<{ orgSlug: string }>
}

const AppointmentsPage = async ({ params }: AppointmentsPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/appointments/list`)
}

export default AppointmentsPage
