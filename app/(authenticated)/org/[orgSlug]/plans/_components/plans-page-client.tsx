'use client'

import { useState } from 'react'
import { Badge } from '@/_components/ui/badge'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import { PLANS, getAnnualDetails } from '@/_lib/billing/plans-data'
import type { PlanType } from '@/_lib/rbac/plan-limits'
import { PlansGrid } from './plans-grid'
import { ComparisonTable } from './comparison-table'
import { PlansFaq } from './plans-faq'

interface PlansPageClientProps {
  currentPlan: PlanType | null
  orgSlug: string
  isOnTrial: boolean
  daysRemaining: number
  neverHadTrial: boolean
  isExpired: boolean
}

export function PlansPageClient({
  currentPlan,
  orgSlug,
  isOnTrial,
  daysRemaining,
}: PlansPageClientProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')

  // Calcula o maior desconto disponível entre todos os planos para exibir no badge anual
  const maxDiscount = PLANS.reduce((max, plan) => {
    const details = getAnnualDetails(plan)
    if (!details) return max
    return Math.max(max, details.discountPercent)
  }, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-12 py-10">
      {/* Badge de contexto trial — só exibe para usuários ainda em trial ativo */}
      {isOnTrial && daysRemaining > 0 && (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="border-yellow-400/60 bg-yellow-400/10 px-4 py-1.5 text-sm text-yellow-600 dark:text-yellow-400"
          >
            Seu teste expira em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Título e subtítulo da página */}
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Escolha o plano ideal para o seu negócio
        </h1>
        <p className="text-muted-foreground">
          Planos flexíveis que crescem com você. Cancele quando quiser.
        </p>
      </div>

      {/* Toggle mensal / anual */}
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-interval" className="text-sm text-muted-foreground">
          Mensal
        </Label>
        <Switch
          id="billing-interval"
          checked={interval === 'yearly'}
          onCheckedChange={(checked) => setInterval(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-interval" className="flex items-center gap-2 text-sm text-muted-foreground">
          Anual
          {maxDiscount > 0 && (
            <Badge
              variant="secondary"
              className="text-xs font-medium text-green-600"
            >
              -{maxDiscount}%
            </Badge>
          )}
        </Label>
      </div>

      {/* Grid de planos */}
      <PlansGrid
        currentPlan={currentPlan}
        orgSlug={orgSlug}
        isOnTrial={isOnTrial}
        interval={interval}
      />

      {/* Tabela comparativa de recursos */}
      <ComparisonTable />

      {/* Perguntas frequentes */}
      <PlansFaq />
    </div>
  )
}
