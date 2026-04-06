'use client'

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
import { Badge } from '@/_components/ui/badge'
import { getAnnualDetails } from '@/_lib/billing/plans-data'
import type { PlanInfo } from '@/_lib/billing/plans-data'
import type { PlanType } from '@/_lib/rbac/plan-limits'

interface PlanCardProps {
  plan: PlanInfo
  currentPlan: PlanType | null
  orgSlug: string
  isOnTrial?: boolean
  interval?: 'monthly' | 'yearly'
  hasActiveSubscription?: boolean
  onPlanChange?: (plan: PlanInfo) => void
}

export function PlanCard({
  plan,
  currentPlan,
  orgSlug,
  isOnTrial,
  interval = 'monthly',
  hasActiveSubscription,
  onPlanChange,
}: PlanCardProps) {
  const router = useRouter()

  const isCurrentPlan = !isOnTrial && currentPlan !== null && plan.id === currentPlan
  const isHighlighted = plan.highlighted
  const isUpgrade = Boolean(plan.stripePriceId)

  // Calcula detalhes do plano anual quando o intervalo selecionado é anual
  const annualDetails = interval === 'yearly' ? getAnnualDetails(plan) : null

  function handleClick() {
    if (isCurrentPlan) return
    if (plan.id === 'enterprise' && !plan.stripePriceId) return

    // Usuário com subscription ativa (não em trial) → abre dialog de mudança de plano
    if (hasActiveSubscription && !isOnTrial && onPlanChange) {
      onPlanChange(plan)
      return
    }

    // Trial ou sem plano → redirecionar para checkout com intervalo selecionado
    if (isUpgrade) {
      const intervalParam = interval === 'yearly' ? '&interval=annual' : ''
      router.push(`/org/${orgSlug}/checkout/configure?plan=${plan.id}${intervalParam}`)
    }
  }

  function getButtonLabel(): string {
    if (isCurrentPlan) return 'Plano atual'
    if (hasActiveSubscription && !isOnTrial) return 'Alterar plano'
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
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
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
          {/* Exibe preço anual equivalente quando o intervalo é anual */}
          {annualDetails ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  R$ {Math.floor(annualDetails.monthlyEquivalent)}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  de R$ {plan.price}/mês
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs font-medium text-green-600"
                >
                  Economize {annualDetails.discountPercent}%
                </Badge>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-4xl font-bold">
                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
              </span>
              {plan.price > 0 && (
                <span className="text-muted-foreground">/mês</span>
              )}
            </div>
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
          disabled={isCurrentPlan}
          onClick={handleClick}
        >
          {getButtonLabel()}
        </Button>
      </CardFooter>
    </Card>
  )
}
