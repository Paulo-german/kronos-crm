import { redirect } from 'next/navigation'

interface DealsPageProps {
  params: Promise<{ orgSlug: string }>
}

const DealsPage = async ({ params }: DealsPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/deals/pipeline`)
}

export default DealsPage
