import { redirect } from 'next/navigation'
import { stripe } from '@/_lib/stripe'
import { PLANS } from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import { createSubscription } from '@/_actions/billing/create-subscription'

interface SetupCompletePageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    setup_intent?: string
    plan?: string
    interval?: string
    seats?: string
  }>
}

/**
 * Fallback para fluxos 3DS que exigem redirect.
 * Quando o banco redireciona o usuário de volta após autenticação 3DS,
 * esta page recupera o PaymentMethod do SetupIntent confirmado,
 * cria a subscription e redireciona para billing.
 */
export default async function SetupCompletePage({
  params,
  searchParams,
}: SetupCompletePageProps) {
  const { orgSlug } = await params
  const { setup_intent, plan, interval, seats } = await searchParams

  const billingUrl = `/org/${orgSlug}/settings/billing`

  if (!setup_intent) {
    redirect(`${billingUrl}?error=missing_setup_intent`)
  }

  // Recuperar o SetupIntent confirmado do Stripe
  const setupIntent = await stripe.setupIntents.retrieve(setup_intent)

  if (setupIntent.status !== 'succeeded') {
    redirect(`${billingUrl}?error=setup_failed`)
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

  if (!paymentMethodId) {
    redirect(`${billingUrl}?error=no_payment_method`)
  }

  // Resolver priceId a partir dos query params
  const selectedPlan = PLANS.find((p) => p.id === plan)
  if (!selectedPlan) {
    redirect(`${billingUrl}?error=invalid_plan`)
  }

  const isAnnual = interval === 'annual'
  const priceId = isAnnual
    ? selectedPlan.stripePriceIdAnnual
    : selectedPlan.stripePriceId

  if (!priceId) {
    redirect(`${billingUrl}?error=invalid_price`)
  }

  const seatsCount = Number(seats) || 1

  // Criar a subscription com o PM validado pelo 3DS
  const result = await createSubscription({
    priceId,
    seats: seatsCount,
    paymentMethodId,
  })

  if (result?.serverError) {
    redirect(`${billingUrl}?error=subscription_failed`)
  }

  redirect(`${billingUrl}?success=true`)
}
