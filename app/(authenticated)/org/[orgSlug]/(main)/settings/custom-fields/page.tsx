import { redirect } from 'next/navigation'

interface CustomFieldsPageProps {
  params: Promise<{ orgSlug: string }>
}

const CustomFieldsPage = async ({ params }: CustomFieldsPageProps) => {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/settings/custom-fields/contact`)
}

export default CustomFieldsPage
