'use client'

import { useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import { createCheckoutSession } from '@/_actions/billing/create-checkout-session'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
)

interface CheckoutFormProps {
  priceId: string
}

export function CheckoutForm({ priceId }: CheckoutFormProps) {
  const fetchClientSecret = useCallback(async () => {
    const result = await createCheckoutSession({ priceId })

    if (!result?.data?.clientSecret) {
      throw new Error('Falha ao criar sessão de checkout.')
    }

    return result.data.clientSecret
  }, [priceId])

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}
