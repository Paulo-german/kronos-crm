'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { createSetupIntent } from '@/_actions/billing/create-setup-intent'
import { createSubscription } from '@/_actions/billing/create-subscription'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
)

interface PaymentFormProps {
  priceId: string
  seats: number
  orgSlug: string
  plan: string
  interval: string
}

export function PaymentForm({ priceId, seats, orgSlug, plan, interval }: PaymentFormProps) {
  const [setupSecret, setSetupSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initSetup = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await createSetupIntent({})

    if (result?.data?.setupSecret) {
      setSetupSecret(result.data.setupSecret)
    } else {
      const msg =
        result?.serverError || 'Falha ao iniciar checkout. Tente novamente.'
      setError(msg)
      toast.error(msg)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    initSetup()
  }, [initSetup])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !setupSecret) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">
          {error || 'Erro ao iniciar checkout.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={initSetup}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: setupSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            borderRadius: '8px',
          },
        },
        locale: 'pt-BR',
      }}
    >
      <CheckoutPaymentForm orgSlug={orgSlug} priceId={priceId} seats={seats} plan={plan} interval={interval} />
    </Elements>
  )
}

interface CheckoutPaymentFormProps {
  orgSlug: string
  priceId: string
  seats: number
  plan: string
  interval: string
}

function CheckoutPaymentForm({
  orgSlug,
  priceId,
  seats,
  plan,
  interval,
}: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()

  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsPending(true)

    // Passo 1: Confirmar o SetupIntent (valida e tokeniza o cartão)
    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required', // Não redirecionar, continuaremos aqui
      confirmParams: {
        return_url: `${window.location.origin}/org/${orgSlug}/checkout/payment/setup-complete?plan=${plan}&interval=${interval}&seats=${seats}`,
      },
    })

    if (setupError) {
      toast.error(setupError.message || 'Erro ao validar cartão.')
      setIsPending(false)
      return
    }

    // Passo 2: Com o cartão validado, criar a assinatura
    if (!setupIntent || !setupIntent.payment_method) {
      toast.error('Falha ao processar cartão. Tente novamente.')
      setIsPending(false)
      return
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method.id

    const subscriptionResult = await createSubscription({
      priceId,
      seats,
      paymentMethodId,
    })

    if (subscriptionResult?.serverError) {
      toast.error(subscriptionResult.serverError || 'Erro ao criar assinatura.')
      setIsPending(false)
      return
    }

    // Sucesso! Redirecionar para a página de sucesso
    toast.success('Assinatura ativada com sucesso!')
    router.push(`/org/${orgSlug}/settings/billing?success=true`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isPending}
      >
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Finalizar Pedido
      </Button>
    </form>
  )
}
