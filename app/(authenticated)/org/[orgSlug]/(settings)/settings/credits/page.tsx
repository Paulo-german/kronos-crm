import { redirect } from 'next/navigation'

interface CreditsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function CreditsSettingsPage({ params }: CreditsSettingsPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/agents/settings/credits`)
}
