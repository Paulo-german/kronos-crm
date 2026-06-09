import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function DashboardRedirect({ params }: Props) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/home`)
}
