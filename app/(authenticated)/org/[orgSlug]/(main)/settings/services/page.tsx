import { redirect } from 'next/navigation'

interface ServicesPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/settings/catalog?tab=services`)
}
