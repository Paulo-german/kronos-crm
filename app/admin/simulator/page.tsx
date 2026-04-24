'use client'

import { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
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
import { AI_MODELS, DEFAULT_AGENT_MODEL_ID } from '@/_lib/ai/models'
import { formatAvgCostPerMessage } from '@/_lib/ai/pricing'
import { PLANS } from '@/_lib/billing/plans-data'

// Créditos mensais por plano — espelho do seed.ts e do CLI script
const PLAN_CREDITS: Record<string, number> = {
  light:      10_000,
  essential:  18_000,
  scale:      45_000,
  enterprise: 72_000,
}

const DEFAULT_RATE        = 5.70
const DEFAULT_MARGIN_PCT  = '30'
const MAX_ANALYSES        = 3

// ─── Utilitários module-level ─────────────────────────────────────────────────
// Remove separadores de milhar BR (ex: "7.048" → 7048) antes de parsear inteiros
const parseInteger = (raw: string) =>
  parseInt(raw.replace(/\./g, '').replace(/,/g, ''), 10)

const fmt = {
  usd:    (n: number) => `$${n.toFixed(4)}`,
  pct:    (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
  number: (n: number) => n.toLocaleString('pt-BR'),
}

function marginBadge(pct: number) {
  if (pct < 0)  return <Badge variant="destructive">Negativo</Badge>
  if (pct < 20) return <Badge variant="outline" className="border-amber-500 text-amber-500">Baixo</Badge>
  return <Badge variant="outline" className="border-emerald-500 text-emerald-500">OK</Badge>
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AnalysisState {
  id: string
  modelId: string
  tpcOverride: string
  tokensRaw: string
  costRaw: string
  rateRaw: string
  targetMarginPct: string
}

function makeBlankAnalysis(): AnalysisState {
  return {
    id:              crypto.randomUUID(),
    modelId:         DEFAULT_AGENT_MODEL_ID,
    tpcOverride:     '',
    tokensRaw:       '',
    costRaw:         '',
    rateRaw:         String(DEFAULT_RATE),
    targetMarginPct: DEFAULT_MARGIN_PCT,
  }
}

// ─── AnalysisPanel ────────────────────────────────────────────────────────────

interface AnalysisPanelProps {
  analysis: AnalysisState
  onChange: (patch: Partial<AnalysisState>) => void
  onRemove?: () => void
}

function AnalysisPanel({ analysis, onChange, onRemove }: AnalysisPanelProps) {
  const { modelId, tpcOverride, tokensRaw, costRaw, rateRaw, targetMarginPct } = analysis

  const results = useMemo(() => {
    const tokens  = parseInteger(tokensRaw)
    const costUsd = Number(costRaw)
    const rate    = Number(rateRaw) || DEFAULT_RATE
    const targetPct = Number(targetMarginPct) || 0

    if (!tokens || !costUsd || tokens <= 0 || costUsd <= 0) return null

    const model = AI_MODELS.find((m) => m.id === modelId)
    const effectiveTpc = tpcOverride ? parseInteger(tpcOverride) : (model?.tokensPerCredit ?? 200)

    if (!effectiveTpc || effectiveTpc <= 0) return null

    const creditsPerInteraction = Math.ceil(tokens / effectiveTpc)
    const costPerCredit         = costUsd / creditsPerInteraction

    const plans = PLANS.map((plan) => {
      const planCredits  = PLAN_CREDITS[plan.id] ?? 0
      const interactions = Math.floor(planCredits / creditsPerInteraction)
      const apiCostUsd   = costUsd * interactions
      const revenueUsd   = plan.price / rate
      const marginUsd    = revenueUsd - apiCostUsd
      const marginPct    = revenueUsd > 0 ? (marginUsd / revenueUsd) * 100 : 0

      // Breakeven: TPC máximo que ainda atinge a margem alvo
      // Derivação: tpc ≤ revenueUsd · (1 − X/100) · tokens / (costUsd · planCredits)
      const maxApiCostUsd = revenueUsd * (1 - targetPct / 100)
      const targetTpc: number | null =
        targetPct > 0 && planCredits > 0
          ? Math.floor((maxApiCostUsd * tokens) / (costUsd * planCredits))
          : null

      return { name: plan.name, credits: planCredits, interactions, apiCostUsd, revenueUsd, marginPct, targetTpc }
    })

    return { modelLabel: model?.label ?? modelId, effectiveTpc, tokens, costUsd, rate, targetPct, creditsPerInteraction, costPerCredit, plans }
  }, [modelId, tpcOverride, tokensRaw, costRaw, rateRaw, targetMarginPct])

  const currentTpcPlaceholder = AI_MODELS.find((m) => m.id === modelId)?.tokensPerCredit ?? 200

  return (
    <div className="flex flex-col gap-4">
      {/* Form de entrada */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Dados da interação</CardTitle>
            <CardDescription className="text-xs">
              Preencha com os valores do log do OpenRouter. Os resultados atualizam automaticamente.
            </CardDescription>
          </div>
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {/* Modelo */}
          <div className="space-y-2 md:col-span-2">
            <Label>Modelo</Label>
            <Select value={modelId} onValueChange={(value) => onChange({ modelId: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-baseline gap-2">
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground/60">
                        {formatAvgCostPerMessage(model)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tokens */}
          <div className="space-y-2">
            <Label>Total de tokens (input + output)</Label>
            <Input
              type="number"
              placeholder="Ex: 6200"
              value={tokensRaw}
              onChange={(e) => onChange({ tokensRaw: e.target.value })}
            />
          </div>

          {/* Custo USD */}
          <div className="space-y-2">
            <Label>Custo cobrado pelo OpenRouter (USD)</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="Ex: 0.0045"
              value={costRaw}
              onChange={(e) => onChange({ costRaw: e.target.value })}
            />
          </div>

          {/* tokensPerCredit override */}
          <div className="space-y-2">
            <Label>
              tokensPerCredit override{' '}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              type="number"
              placeholder={`Ex: ${currentTpcPlaceholder}`}
              value={tpcOverride}
              onChange={(e) => onChange({ tpcOverride: e.target.value })}
            />
          </div>

          {/* Taxa de câmbio */}
          <div className="space-y-2">
            <Label>Taxa de câmbio BRL/USD</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={String(DEFAULT_RATE)}
              value={rateRaw}
              onChange={(e) => onChange({ rateRaw: e.target.value })}
            />
          </div>

          {/* Margem mínima desejada */}
          <div className="space-y-2 md:col-span-2">
            <Label>
              Margem mínima desejada (%){' '}
              <span className="text-xs text-muted-foreground">
                (para calcular o TPC alvo por plano)
              </span>
            </Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="99"
              placeholder="Ex: 30"
              value={targetMarginPct}
              onChange={(e) => onChange({ targetMarginPct: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results ? (
        <>
          {/* Resumo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-3">
                {[
                  ['Modelo',              results.modelLabel],
                  ['Tokens na amostra',   fmt.number(results.tokens)],
                  ['Custo OpenRouter',    fmt.usd(results.costUsd)],
                  ['tokensPerCredit',     fmt.number(results.effectiveTpc)],
                  ['Créditos/interação',  String(results.creditsPerInteraction)],
                  ['Custo/crédito (API)', fmt.usd(results.costPerCredit)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border/40 pb-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Tabela de margem */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Margem por plano</CardTitle>
              <CardDescription className="text-xs">
                Custo API = servir TODAS as interações possíveis com os créditos do plano.
                {results.targetPct > 0 && ` TPC alvo = TPC máximo para atingir ${results.targetPct}% de margem.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Interações</TableHead>
                    <TableHead className="text-right">Custo API</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    {results.targetPct > 0 && (
                      <TableHead className="text-right">TPC alvo</TableHead>
                    )}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.plans.map((plan) => (
                    <TableRow key={plan.name}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmt.number(plan.credits)}
                      </TableCell>
                      <TableCell className="text-right">{fmt.number(plan.interactions)}</TableCell>
                      <TableCell className="text-right">{fmt.usd(plan.apiCostUsd)}</TableCell>
                      <TableCell className="text-right">{fmt.usd(plan.revenueUsd)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt.pct(plan.marginPct)}
                      </TableCell>
                      {results.targetPct > 0 && (
                        <TableCell className="text-right font-mono text-sm">
                          {plan.targetTpc === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : plan.targetTpc <= 0 ? (
                            <span className="text-destructive">impossível</span>
                          ) : (
                            <span className={plan.targetTpc >= results.effectiveTpc ? 'text-emerald-500' : 'text-destructive'}>
                              {fmt.number(plan.targetTpc)}
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{marginBadge(plan.marginPct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">
              Preencha os campos de tokens e custo para ver os resultados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── SimulatorPage ────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [analyses, setAnalyses] = useState<AnalysisState[]>([makeBlankAnalysis()])

  const addAnalysis = () => setAnalyses((prev) => [...prev, makeBlankAnalysis()])

  const removeAnalysis = (id: string) =>
    setAnalyses((prev) => prev.filter((a) => a.id !== id))

  const patchAnalysis = (id: string, patch: Partial<AnalysisState>) =>
    setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const gridCols =
    analyses.length === 1 ? '' : analyses.length === 2 ? '2xl:grid-cols-2' : '2xl:grid-cols-3'

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Simulador de Margem</HeaderTitle>
          <HeaderSubTitle>
            Cole os dados reais do OpenRouter e veja a margem por plano em tempo real.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={analyses.length >= MAX_ANALYSES}
          onClick={addAnalysis}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova análise
        </Button>
      </div>

      <div className={cn('grid gap-6', gridCols)}>
        {analyses.map((analysis) => (
          <AnalysisPanel
            key={analysis.id}
            analysis={analysis}
            onChange={(patch) => patchAnalysis(analysis.id, patch)}
            onRemove={analyses.length > 1 ? () => removeAnalysis(analysis.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
