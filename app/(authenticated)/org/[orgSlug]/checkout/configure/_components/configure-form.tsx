'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import {
  getAnnualDetails,
  type PlanInfo,
} from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import type { PlanInterval } from '../../_components/checkout-types'

interface ConfigureFormProps {
  plan: PlanInfo
  orgSlug: string
}

export function ConfigureForm({ plan, orgSlug }: ConfigureFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [interval, setInterval] = useState<PlanInterval>(
    (searchParams.get('interval') as PlanInterval) || 'monthly',
  )

  const annual = getAnnualDetails(plan)

  // Sync with URL whenever state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    if (plan.id) params.set('plan', plan.id)
    params.set('interval', interval)

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [interval, pathname, router, searchParams, plan.id])

  function handleContinue() {
    const params = new URLSearchParams(searchParams)
    params.set('plan', plan.id)
    params.set('interval', interval)

    router.push(`/org/${orgSlug}/checkout/register?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Intervalo */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Intervalo de cobrança</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={cn(
              'rounded-lg border-2 p-4 text-left transition-colors',
              interval === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40',
            )}
          >
            <div className="font-medium">Mensal</div>
            <div className="mt-1 text-sm text-muted-foreground">
              R$ {plan.price.toFixed(2).replace('.', ',')}/mês
            </div>
          </button>

          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={cn(
              'relative rounded-lg border-2 p-4 text-left transition-colors',
              interval === 'annual'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40',
            )}
          >
            {annual && annual.discountPercent > 0 && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                -{annual.discountPercent}%
              </span>
            )}
            <div className="font-medium">Anual</div>
            <div className="mt-1 text-sm text-muted-foreground">
              R$ {annual
                ? annual.monthlyEquivalent.toFixed(2).replace('.', ',')
                : plan.price.toFixed(2).replace('.', ',')}/mês
            </div>
          </button>
        </div>
      </div>

      {/* Botão */}
      <Button className="w-full" size="lg" onClick={handleContinue}>
        Continuar
      </Button>
    </div>
  )
}
