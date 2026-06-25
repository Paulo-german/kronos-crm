import { redirect } from 'next/navigation'

interface ProspectionRootPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProspectionRootPage = async ({ params }: ProspectionRootPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/prospection/home`)
}

export default ProspectionRootPage
