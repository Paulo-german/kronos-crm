'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import type { PlanInfo } from '@/(authenticated)/org/[orgSlug]/(main)/settings/billing/_components/plans-data'
import type { PlanInterval } from '../../_components/checkout-types'

interface ConfigureFormProps {
  plan: PlanInfo
  orgSlug: string
}

const MIN_SEATS = 1
const MAX_SEATS = 100

export function ConfigureForm({ plan, orgSlug }: ConfigureFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL or defaults
  const [interval, setInterval] = useState<PlanInterval>(
    (searchParams.get('interval') as PlanInterval) || 'monthly',
  )
  const [seats, setSeats] = useState(Number(searchParams.get('seats')) || 1)

  const hasAnnual = Boolean(plan.annualPrice && plan.stripePriceIdAnnual)

  // Sync with URL whenever state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    // Ensure we keep existing params like 'plan'
    if (plan.id) params.set('plan', plan.id)

    params.set('interval', interval)
    params.set('seats', String(seats))

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [interval, seats, pathname, router, searchParams, plan.id])

  function handleContinue() {
    // Navigate to next step with current params
    const params = new URLSearchParams(searchParams)
    params.set('plan', plan.id)
    params.set('interval', interval)
    params.set('seats', String(seats))

    router.push(`/org/${orgSlug}/checkout/register?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Intervalo */}
      {hasAnnual && (
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
                R$ {plan.price.toFixed(2).replace('.', ',')}/mês por licença
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
              {plan.discountPercent && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                  -{plan.discountPercent}%
                </span>
              )}
              <div className="font-medium">Anual</div>
              <div className="mt-1 text-sm text-muted-foreground">
                R$ {plan.annualPrice?.toFixed(2).replace('.', ',')}/mês por
                licença
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Seats */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Licenças (seats)</Label>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              Cada membro da equipe precisa de 1 licença.
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setSeats((s) => Math.max(MIN_SEATS, s - 1))}
                disabled={seats <= MIN_SEATS}
              >
                <Minus className="size-4" />
              </Button>

              <span className="w-8 text-center text-lg font-semibold tabular-nums">
                {seats}
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setSeats((s) => Math.min(MAX_SEATS, s + 1))}
                disabled={seats >= MAX_SEATS}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão */}
      <Button className="w-full" size="lg" onClick={handleContinue}>
        Continuar
      </Button>
    </div>
  )
}
