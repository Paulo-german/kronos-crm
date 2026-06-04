import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function AutomationsRedirectPage({ params }: Props) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/settings/automations`)
}
