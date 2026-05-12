import { redirect } from 'next/navigation'

interface ProductsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/settings/catalog?tab=products`)
}
