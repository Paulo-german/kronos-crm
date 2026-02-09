'use client'

import { useSearchParams } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { PLANS } from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import type { PlanInterval } from './checkout-types'

export function OrderSummary() {
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const interval = (searchParams.get('interval') || 'monthly') as PlanInterval
  const seats = Number(searchParams.get('seats')) || 1

  const plan = PLANS.find((p) => p.id === planId)

  if (!plan) return null

  const isAnnual = interval === 'annual'
  const unitPrice = isAnnual && plan.annualPrice ? plan.annualPrice : plan.price
  const totalMonthly = unitPrice * seats
  const totalDisplay = isAnnual
    ? (plan.annualTotalPrice || unitPrice * 12) * seats
    : totalMonthly

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
            {plan.discountPercent && isAnnual ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                -{plan.discountPercent}%
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Intervalo</span>
            <span>{isAnnual ? 'Anual' : 'Mensal'}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Licenças</span>
            <span>{seats}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Preço por licença</span>
            <span>R$ {unitPrice.toFixed(2).replace('.', ',')}/mês</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <div className="text-right">
              <div className="text-lg">
                R$ {totalDisplay.toFixed(2).replace('.', ',')}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isAnnual ? 'ano' : 'mês'}
                </span>
              </div>
              {isAnnual && (
                <p className="text-xs font-normal text-muted-foreground">
                  equivalente a R$ {totalMonthly.toFixed(2).replace('.', ',')}
                  /mês
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
