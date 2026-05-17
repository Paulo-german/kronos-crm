'use client'

import { ArrowRight, GitBranch } from 'lucide-react'
import { cn } from '@/_lib/utils'
import type { FunnelStage } from '@/_data-access/dashboard/types'

interface PipelineFunnelProps {
  stages: FunnelStage[]
  totalDeals: number
  wonDeals: number
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.0', '')}k`
  }
  return `R$ ${value.toFixed(0)}`
}

function calcConversionRate(from: number, to: number): string {
  if (from === 0) return '—'
  return `${Math.round((to / from) * 100)}%`
}

function getConversionColor(from: number, to: number): string {
  if (from === 0) return 'bg-muted text-muted-foreground'
  const rate = (to / from) * 100
  if (rate >= 50) return 'bg-emerald-500/10 text-emerald-600'
  if (rate >= 30) return 'bg-amber-500/10 text-amber-600'
  return 'bg-red-500/10 text-red-600'
}

export function PipelineFunnel({ stages, totalDeals, wonDeals }: PipelineFunnelProps) {
  const allEmpty = stages.every((stage) => stage.count === 0)

  if (stages.length === 0 || allEmpty) {
    return (
      <div className="flex h-[120px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <GitBranch className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum deal no pipeline</p>
      </div>
    )
  }

  const maxCount = Math.max(...stages.map((stage) => stage.count))
  const totalConversion = calcConversionRate(totalDeals, wonDeals)

  return (
    <div className="flex flex-col gap-4">
      {/* Stage cards com setas de conversão */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max items-stretch gap-0">
          {stages.map((stage, index) => {
            const fillPercent =
              maxCount === 0 ? 0 : Math.round((stage.count / maxCount) * 100)
            const isLast = index === stages.length - 1
            const nextStage = stages[index + 1]

            return (
              <div key={stage.stageId} className="flex items-center gap-0">
                {/* Stage card */}
                <div className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-primary/20 hover:shadow-sm">
                  {/* Nome do estágio */}
                  <span
                    className="truncate text-xs font-medium text-muted-foreground"
                    title={stage.stageName}
                  >
                    {stage.stageName}
                  </span>

                  {/* Count */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums">
                      {stage.count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stage.count === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>

                  {/* Valor monetário */}
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatCurrency(stage.value)}
                  </span>

                  {/* Barra de progresso proporcional */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(fillPercent, 2)}%` }}
                    />
                  </div>
                </div>

                {/* Seta + badge de conversão entre estágios */}
                {!isLast && nextStage && (
                  <div className="flex flex-col items-center gap-0.5 px-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                        getConversionColor(stage.count, nextStage.count),
                      )}
                    >
                      {calcConversionRate(stage.count, nextStage.count)}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé com taxa de conversão real (WON / total) */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Taxa de conversão:</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-semibold',
            getConversionColor(totalDeals, wonDeals),
          )}
        >
          {totalConversion}
        </span>
        <span>
          ({wonDeals} de {totalDeals} {totalDeals === 1 ? 'deal' : 'deals'})
        </span>
      </div>
    </div>
  )
}
