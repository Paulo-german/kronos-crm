'use client'

import { Badge } from '@/_components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import type { BusinessMetrics, PlanBaseline } from '@/admin/business/_lib/business-calculations'

const fmt = {
  brl: (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  pct: (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
  number: (n: number) => n.toLocaleString('pt-BR'),
}

function MarginBadge({ marginPct, targetPct }: { marginPct: number; targetPct: number }) {
  if (marginPct < 0)
    return <Badge variant="destructive">Negativo</Badge>
  if (marginPct < targetPct)
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-500">
        Abaixo do alvo
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-emerald-500 text-emerald-500">
      OK
    </Badge>
  )
}

interface BusinessKpiCardsProps {
  metrics: BusinessMetrics
  baseline: PlanBaseline[]
}

export function BusinessKpiCards({ metrics, baseline }: BusinessKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Card 1: Estado atual */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Estado atual</CardDescription>
          <CardTitle
            className={cn(
              'text-2xl',
              metrics.marginPct < 0
                ? 'text-destructive'
                : metrics.marginPct < metrics.targetMargin
                ? 'text-amber-500'
                : 'text-emerald-500',
            )}
          >
            {fmt.pct(metrics.marginPct)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receita</span>
            <span>{fmt.brl(metrics.totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo IA</span>
            <span>−{fmt.brl(metrics.totalAiCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo fixo</span>
            <span>−{fmt.brl(metrics.totalFixed)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Resultado</span>
            <span
              className={
                metrics.marginBRL < 0 ? 'text-destructive' : 'text-emerald-500'
              }
            >
              {fmt.brl(metrics.marginBRL)}
            </span>
          </div>
          <div className="pt-1">
            <MarginBadge
              marginPct={metrics.marginPct}
              targetPct={metrics.targetMargin}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Break-even */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Break-even — clientes adicionais</CardDescription>
          <CardTitle className="text-2xl">
            {metrics.extraCustomersNeeded === null ? (
              <span className="text-lg text-destructive">Impossível</span>
            ) : metrics.extraCustomersNeeded <= 0 ? (
              <span className="text-lg text-emerald-500">Margem alvo atingida ✓</span>
            ) : (
              `+${fmt.number(metrics.extraCustomersNeeded)}`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {metrics.extraCustomersNeeded === null ? (
            <p>
              Com os parâmetros atuais, cada novo cliente gera prejuízo no alvo
              de margem. Revise os custos ou reduza o alvo.
            </p>
          ) : metrics.extraCustomersNeeded <= 0 ? (
            <p>
              A margem atual ({fmt.pct(metrics.marginPct)}) já supera o alvo de{' '}
              {metrics.targetMargin}%. Nenhum cliente adicional necessário.
            </p>
          ) : (
            <p>
              Clientes no mix atual para atingir {metrics.targetMargin}% de
              margem. Base atual: {fmt.number(metrics.totalCustomers)}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Precificação sugerida */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Ajuste de preços sugerido</CardDescription>
          <CardTitle className="text-2xl">
            {metrics.priceAdjustmentPct === null ? (
              '—'
            ) : metrics.priceAdjustmentPct <= 0 ? (
              <span className="text-lg text-emerald-500">Nenhum ajuste</span>
            ) : (
              `+${metrics.priceAdjustmentPct.toFixed(1)}%`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {metrics.priceAdjustmentPct !== null && metrics.priceAdjustmentPct > 0 ? (
            baseline.map((plan) => (
              <div key={plan.id} className="flex justify-between">
                <span className="text-muted-foreground">{plan.name}</span>
                <span>
                  <span className="mr-1 text-muted-foreground line-through">
                    {fmt.brl(plan.price)}
                  </span>
                  {fmt.brl(metrics.suggestedPrices[plan.id] ?? plan.price)}
                </span>
              </div>
            ))
          ) : metrics.priceAdjustmentPct !== null ? (
            <p className="text-muted-foreground">
              Os preços atuais já são suficientes para atingir a margem alvo.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Preencha a margem alvo para ver a sugestão de precificação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
