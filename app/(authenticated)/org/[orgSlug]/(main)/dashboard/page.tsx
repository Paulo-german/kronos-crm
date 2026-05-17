import { redirect } from 'next/navigation'

interface DashboardRootPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function DashboardRootPage({
  params,
  searchParams,
}: DashboardRootPageProps) {
  const { orgSlug } = await params
  const sp = await searchParams
  const queryString = new URLSearchParams(
    Object.entries(sp).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ).toString()
  redirect(
    `/org/${orgSlug}/dashboard/v2${queryString ? `?${queryString}` : ''}`,
  )
}
