import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { PLANS } from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import { PaymentForm } from './_components/payment-form'
import type { CheckoutSearchParams } from '../_components/checkout-types'

interface PaymentPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<CheckoutSearchParams>
}

export default async function PaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { orgSlug } = await params
  const { plan, interval, seats } = await searchParams
  const { userRole } = await getOrgContext(orgSlug)

  if (!isElevated(userRole)) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  const selectedPlan = PLANS.find((p) => p.id === plan)
  if (!selectedPlan || selectedPlan.id === 'free') {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  // Determinar priceId baseado no intervalo
  const isAnnual = interval === 'annual'
  const priceId = isAnnual
    ? selectedPlan.stripePriceIdAnnual
    : selectedPlan.stripePriceId

  if (!priceId) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  const seatsCount = Number(seats) || 1

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Pagamento</h1>
      <p className="mb-8 text-muted-foreground">
        Insira os dados de pagamento para ativar o plano {selectedPlan.name}.
      </p>

      <PaymentForm
        priceId={priceId}
        seats={seatsCount}
        orgSlug={orgSlug}
        plan={selectedPlan.id}
        interval={interval || 'monthly'}
      />
    </div>
  )
}
