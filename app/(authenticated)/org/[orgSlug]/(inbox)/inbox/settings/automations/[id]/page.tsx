import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ orgSlug: string; id: string }>
}

export default async function AutomationDetailRedirectPage({ params }: Props) {
  const { orgSlug, id } = await params
  redirect(`/org/${orgSlug}/crm/settings/automations/${id}`)
}
