import { redirect } from 'next/navigation'

export default async function ReportsRootPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/reports/overview`)
}
