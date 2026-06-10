import { LifecycleStage } from '@prisma/client'
import { InfoIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { formatVariation } from '@/_utils/date-range'
import type { LifecycleStageMetrics } from '@/_data-access/dashboard-v2/get-lifecycle-funnel-metrics'

interface LifecycleStageCardProps {
  metrics: LifecycleStageMetrics
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value)
}

function StageSubInfo({ metrics }: { metrics: LifecycleStageMetrics }) {
  if (metrics.stage === LifecycleStage.LEAD) {
    const count = metrics.autoCaptureCount ?? 0
    return (
      <p className="text-sm text-muted-foreground">
        {count} {count === 1 ? 'captura automática' : 'capturas automáticas'}
      </p>
    )
  }

  if (metrics.stage === LifecycleStage.QUALIFIED) {
    const aiCount = metrics.aiQualifiedCount ?? 0
    const total = metrics.aiQualifiedTotal ?? 0
    if (aiCount === 0 && total === 0) {
      return <p className="text-sm text-muted-foreground">0/0 pela IA</p>
    }
    return (
      <p className="text-sm text-muted-foreground">
        {aiCount}/{total} pela IA
      </p>
    )
  }

  if (metrics.stage === LifecycleStage.OPPORTUNITY) {
    const value = metrics.openPipelineValue ?? 0
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{formatBRL(value)}</span>{' '}
        em jogo
      </p>
    )
  }

  // CUSTOMER
  const unique = metrics.uniqueCustomerCount ?? 0
  return (
    <p className="text-xs text-muted-foreground">
      {unique} {unique === 1 ? 'cliente único' : 'clientes únicos'} no período
    </p>
  )
}

export function LifecycleStageCard({ metrics }: LifecycleStageCardProps) {
  const config = LIFECYCLE_STAGE_CONFIG[metrics.stage]
  const Icon = config.icon
  const variation = formatVariation(
    metrics.periodCount,
    metrics.prevPeriodCount,
  )

  const badgeVariant = (() => {
    if (metrics.periodCount === 0 && metrics.prevPeriodCount === 0)
      return 'outline' as const
    if (variation.isPositive) return 'success' as const
    return 'destructive' as const
  })()

  const badgeLabel = (() => {
    if (metrics.periodCount === 0 && metrics.prevPeriodCount === 0) return '—'
    return variation.value
  })()

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Icon className={`size-4 ${config.colorClassName}`} />
            {config.label}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <InfoIcon className="size-3 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56 bg-[hsl(var(--primary-dark))] text-center text-xs text-white shadow-none">
                {config.dashboardHint}
              </TooltipContent>
            </Tooltip>
          </span>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
        <div>
          <p className="text-3xl font-bold tabular-nums">
            {metrics.periodCount}
          </p>
          {/* {metrics.stage === LifecycleStage.CUSTOMER && (
            <p className="text-xs text-muted-foreground">entradas no período</p>
          )} */}
        </div>
        <div className="space-y-1">
          {/* <StageSubInfo metrics={metrics} /> */}
          <p className="text-xs text-muted-foreground">
            {metrics.stockCount} contatos atualmente nesta etapa
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
