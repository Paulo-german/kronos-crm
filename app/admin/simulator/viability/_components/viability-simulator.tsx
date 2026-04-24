'use client'

import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/_components/ui/card'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'

interface PlanBaseline {
  id: string
  name: string
  price: number
  credits: number
  activeCount: number
}

interface ViabilitySimulatorProps {
  baseline: PlanBaseline[]
}

const DEFAULT_RATE = 5.70

const fmt = {
  brl:    (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  pct:    (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
  number: (n: number) => n.toLocaleString('pt-BR'),
}

function MarginBadge({ marginPct, targetPct }: { marginPct: number; targetPct: number }) {
  if (marginPct < 0) return <Badge variant="destructive">Negativo</Badge>
  if (marginPct < targetPct)
    return <Badge variant="outline" className="border-amber-500 text-amber-500">Abaixo do alvo</Badge>
  return <Badge variant="outline" className="border-emerald-500 text-emerald-500">OK</Badge>
}

export function ViabilitySimulator({ baseline }: ViabilitySimulatorProps) {
  const [infra,             setInfra]             = useState('')
  const [tools,             setTools]             = useState('')
  const [payroll,           setPayroll]           = useState('')
  const [other,             setOther]             = useState('')
  const [costPerCreditUsd,  setCostPerCreditUsd]  = useState('')
  const [rateRaw,           setRateRaw]           = useState(String(DEFAULT_RATE))
  const [targetMarginPct,   setTargetMarginPct]   = useState('30')

  const totalFixed = (Number(infra) || 0) + (Number(tools) || 0) + (Number(payroll) || 0) + (Number(other) || 0)

  const results = useMemo(() => {
    const rate         = Number(rateRaw) || DEFAULT_RATE
    const costPerCredit = Number(costPerCreditUsd) || 0
    const targetMargin = Math.min(Number(targetMarginPct) || 0, 99)
    const fixed        = (Number(infra) || 0) + (Number(tools) || 0) + (Number(payroll) || 0) + (Number(other) || 0)

    const plans = baseline.map((plan) => ({
      ...plan,
      revenueBRL: plan.activeCount * plan.price,
      aiCostBRL:  plan.activeCount * plan.credits * costPerCredit * rate,
    }))

    const totalRevenue   = plans.reduce((sum, p) => sum + p.revenueBRL, 0)
    const totalAiCost    = plans.reduce((sum, p) => sum + p.aiCostBRL, 0)
    const totalCustomers = baseline.reduce((sum, p) => sum + p.activeCount, 0)
    const totalCost      = fixed + totalAiCost
    const marginBRL      = totalRevenue - totalCost
    const marginPct      = totalRevenue > 0 ? (marginBRL / totalRevenue) * 100 : 0

    // Break-even: clientes adicionais no mix atual para atingir margem alvo
    let extraCustomersNeeded: number | null = null
    if (totalCustomers > 0 && targetMargin > 0) {
      const avgRevenue         = totalRevenue / totalCustomers
      const avgAiCost          = totalAiCost / totalCustomers
      const contribPerCustomer = avgRevenue * (1 - targetMargin / 100) - avgAiCost
      if (contribPerCustomer > 0) {
        const gap = fixed - (totalRevenue * (1 - targetMargin / 100) - totalAiCost)
        extraCustomersNeeded = gap > 0 ? Math.ceil(gap / contribPerCustomer) : 0
      }
      // null = impossível: cada novo cliente piora a margem no alvo
    }

    // Precificação reversa: ajuste % uniforme nos preços para atingir margem alvo
    let priceAdjustmentPct: number | null = null
    const suggestedPrices: Record<string, number> = {}
    if (totalRevenue > 0 && targetMargin > 0) {
      const uniformMultiplier = (fixed + totalAiCost) / (totalRevenue * (1 - targetMargin / 100))
      priceAdjustmentPct = (uniformMultiplier - 1) * 100
      for (const plan of baseline) {
        suggestedPrices[plan.id] = Math.ceil(plan.price * uniformMultiplier)
      }
    }

    return {
      plans,
      totalRevenue,
      totalAiCost,
      totalFixed: fixed,
      totalCost,
      marginBRL,
      marginPct,
      totalCustomers,
      targetMargin,
      extraCustomersNeeded,
      priceAdjustmentPct,
      suggestedPrices,
    }
  }, [baseline, infra, tools, payroll, other, costPerCreditUsd, rateRaw, targetMarginPct])

  return (
    <div className="flex flex-col gap-6">
      {/* Formulário de inputs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Custos fixos mensais (R$)</CardTitle>
            <CardDescription className="text-xs">Infra, ferramentas, equipe, etc.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Infraestrutura</Label>
              <Input type="number" step="1" placeholder="Ex: 800" value={infra} onChange={(e) => setInfra(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ferramentas / SaaS</Label>
              <Input type="number" step="1" placeholder="Ex: 500" value={tools} onChange={(e) => setTools(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salários / RH</Label>
              <Input type="number" step="1" placeholder="Ex: 15000" value={payroll} onChange={(e) => setPayroll(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Outros</Label>
              <Input type="number" step="1" placeholder="Ex: 200" value={other} onChange={(e) => setOther(e.target.value)} />
            </div>
            <div className="md:col-span-2 border-t pt-3 text-sm text-muted-foreground">
              Total fixo:{' '}
              <span className="font-semibold text-foreground">{fmt.brl(totalFixed)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Parâmetros de IA & meta</CardTitle>
            <CardDescription className="text-xs">
              O custo/crédito é exibido como &quot;Custo/crédito (API)&quot; no Simulador de Créditos IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Custo médio por crédito IA (USD)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="Ex: 0.000020"
                value={costPerCreditUsd}
                onChange={(e) => setCostPerCreditUsd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de câmbio BRL/USD</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5.70"
                value={rateRaw}
                onChange={(e) => setRateRaw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Margem alvo (%)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="99"
                placeholder="30"
                value={targetMarginPct}
                onChange={(e) => setTargetMarginPct(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base de clientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Base de clientes atual</CardTitle>
          <CardDescription className="text-xs">
            Assinaturas ativas e em trial — lidas do banco em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Preço/mês</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custo IA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-right">{fmt.number(plan.activeCount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt.brl(plan.price)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt.number(plan.credits)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt.brl(plan.revenueBRL)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt.brl(plan.aiCostBRL)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{fmt.number(results.totalCustomers)}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{fmt.brl(results.totalRevenue)}</TableCell>
                <TableCell className="text-right">{fmt.brl(results.totalAiCost)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.totalCustomers === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura ativa encontrada. Os resultados aparecerão assim que houver clientes com assinatura ativa ou em trial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Estado atual */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Estado atual</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl',
                  results.marginPct < 0
                    ? 'text-destructive'
                    : results.marginPct < results.targetMargin
                    ? 'text-amber-500'
                    : 'text-emerald-500',
                )}
              >
                {fmt.pct(results.marginPct)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita</span>
                <span>{fmt.brl(results.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo IA</span>
                <span>−{fmt.brl(results.totalAiCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo fixo</span>
                <span>−{fmt.brl(results.totalFixed)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Resultado</span>
                <span className={results.marginBRL < 0 ? 'text-destructive' : 'text-emerald-500'}>
                  {fmt.brl(results.marginBRL)}
                </span>
              </div>
              <div className="pt-1">
                <MarginBadge marginPct={results.marginPct} targetPct={results.targetMargin} />
              </div>
            </CardContent>
          </Card>

          {/* Break-even */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Break-even — clientes adicionais</CardDescription>
              <CardTitle className="text-2xl">
                {results.extraCustomersNeeded === null ? (
                  <span className="text-lg text-destructive">Impossível</span>
                ) : results.extraCustomersNeeded <= 0 ? (
                  <span className="text-lg text-emerald-500">Já atingiu</span>
                ) : (
                  `+${fmt.number(results.extraCustomersNeeded)}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {results.extraCustomersNeeded === null ? (
                <p>
                  Com os parâmetros atuais, cada novo cliente gera prejuízo no alvo de margem. Revise os
                  custos ou reduza o alvo.
                </p>
              ) : results.extraCustomersNeeded <= 0 ? (
                <p>
                  A margem atual ({fmt.pct(results.marginPct)}) já supera o alvo de{' '}
                  {results.targetMargin}%. Nenhum cliente adicional necessário.
                </p>
              ) : (
                <p>
                  Clientes no mix atual para atingir {results.targetMargin}% de margem. Base atual:{' '}
                  {fmt.number(results.totalCustomers)}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Precificação sugerida */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ajuste de preços sugerido</CardDescription>
              <CardTitle className="text-2xl">
                {results.priceAdjustmentPct === null ? (
                  '—'
                ) : results.priceAdjustmentPct <= 0 ? (
                  <span className="text-lg text-emerald-500">Nenhum ajuste</span>
                ) : (
                  `+${results.priceAdjustmentPct.toFixed(1)}%`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {results.priceAdjustmentPct !== null && results.priceAdjustmentPct > 0 ? (
                baseline.map((plan) => (
                  <div key={plan.id} className="flex justify-between">
                    <span className="text-muted-foreground">{plan.name}</span>
                    <span>
                      <span className="mr-1 text-muted-foreground line-through">{fmt.brl(plan.price)}</span>
                      {fmt.brl(results.suggestedPrices[plan.id] ?? plan.price)}
                    </span>
                  </div>
                ))
              ) : results.priceAdjustmentPct !== null ? (
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
      )}
    </div>
  )
}
