'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/_lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { createPortalSession } from '@/_actions/billing/create-portal-session'
import type { PlanInfo } from './plans-data'
import type { PlanType } from '@/_lib/rbac/plan-limits'

interface PlanCardProps {
  plan: PlanInfo
  currentPlan: PlanType
  orgSlug: string
}

export function PlanCard({ plan, currentPlan, orgSlug }: PlanCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isCurrentPlan = plan.id === currentPlan
  const isHighlighted = plan.highlighted
  const isPaidPlan = currentPlan !== 'free'
  const isUpgrade = plan.stripePriceId && !isCurrentPlan

  function handleClick() {
    // Plano atual — nada a fazer
    if (isCurrentPlan) return

    // Plano enterprise sem priceId — contato comercial
    if (plan.id === 'enterprise' && !plan.stripePriceId) {
      return
    }

    // Se o usuário já é pagante, abrir portal para gerenciar/mudar plano
    if (isPaidPlan) {
      startTransition(async () => {
        const result = await createPortalSession({})
        if (result?.data?.url) {
          window.location.href = result.data.url
        }
      })
      return
    }

    // Se é free e quer fazer upgrade, redirecionar para checkout
    if (isUpgrade) {
      router.push(`/org/${orgSlug}/checkout/configure?plan=${plan.id}`)
    }
  }

  function getButtonLabel(): string {
    if (isCurrentPlan) return 'Plano atual'
    if (isPaidPlan) return 'Gerenciar assinatura'
    return plan.cta
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isHighlighted && 'border-primary shadow-lg',
      )}
    >
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-medium">
            Mais popular
          </span>
        </div>
      )}

      <CardHeader className={cn(isHighlighted && 'pt-6')}>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">
            {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
          </span>
          {plan.price > 0 && (
            <span className="text-muted-foreground">/mês</span>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature.name} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
              <span className="text-sm">{feature.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : isHighlighted ? 'default' : 'secondary'}
          disabled={isCurrentPlan || isPending}
          onClick={handleClick}
        >
          {isPending ? 'Carregando...' : getButtonLabel()}
        </Button>
      </CardFooter>
    </Card>
  )
}
