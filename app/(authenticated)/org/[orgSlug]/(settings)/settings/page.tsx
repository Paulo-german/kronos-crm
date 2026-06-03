import { redirect } from 'next/navigation'

interface SettingsRootPageProps {
  params: Promise<{ orgSlug: string }>
}

const SettingsRootPage = async ({ params }: SettingsRootPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/settings/organization`)
}

export default SettingsRootPage
