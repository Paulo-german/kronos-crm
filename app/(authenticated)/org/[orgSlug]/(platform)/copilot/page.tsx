import { redirect } from 'next/navigation'

interface CopilotPageProps {
  params: Promise<{ orgSlug: string }>
}

// feat desativada temporariamente
export default async function CopilotPage({ params }: CopilotPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/crm/home`)
}
