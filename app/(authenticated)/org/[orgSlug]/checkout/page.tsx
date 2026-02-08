import { redirect } from 'next/navigation'

interface CheckoutPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ plan?: string }>
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { orgSlug } = await params
  const { plan } = await searchParams

  const target = plan
    ? `/org/${orgSlug}/checkout/configure?plan=${plan}`
    : `/org/${orgSlug}/settings/billing`

  redirect(target)
}
