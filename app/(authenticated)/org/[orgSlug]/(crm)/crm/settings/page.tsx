import { redirect } from 'next/navigation'

interface CrmSettingsRootPageProps {
  params: Promise<{ orgSlug: string }>
}

const CrmSettingsRootPage = async ({ params }: CrmSettingsRootPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/settings/pipelines`)
}

export default CrmSettingsRootPage
