'use client'

import { useSearchParams } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  PLANS,
  getAnnualDetails,
} from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import type { PlanInterval } from './checkout-types'

export function OrderSummary() {
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const interval = (searchParams.get('interval') || 'monthly') as PlanInterval

  const plan = PLANS.find((p) => p.id === planId)

  if (!plan) return null

  const isAnnual = interval === 'annual'
  const annual = getAnnualDetails(plan)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="size-5" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Plano {plan.name}</span>
            {isAnnual && annual && annual.discountPercent > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                -{annual.discountPercent}%
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Intervalo</span>
            <span>{isAnnual ? 'Anual' : 'Mensal'}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <div className="text-right">
              <div className="text-lg">
                R$ {isAnnual && plan.annualTotalPrice
                  ? plan.annualTotalPrice.toFixed(2).replace('.', ',')
                  : plan.price.toFixed(2).replace('.', ',')}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isAnnual ? 'ano' : 'mês'}
                </span>
              </div>
              {isAnnual && annual && (
                <p className="text-xs font-normal text-muted-foreground">
                  equivalente a R$ {annual.monthlyEquivalent.toFixed(2).replace('.', ',')}/mês
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
