import { redirect } from 'next/navigation'

interface CrmPageProps {
  params: Promise<{ orgSlug: string }>
}

const CrmPage = async ({ params }: CrmPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/pipeline`)
}

export default CrmPage
