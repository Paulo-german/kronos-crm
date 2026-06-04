import { LifecycleStage } from '@prisma/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
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
        <span className="font-medium text-foreground">{formatBRL(value)}</span> em jogo
      </p>
    )
  }

  // CUSTOMER
  const atRisk = metrics.atRiskCount ?? 0
  return (
    <p
      className={
        atRisk > 0
          ? 'text-sm font-medium text-destructive'
          : 'text-sm text-muted-foreground'
      }
    >
      {atRisk} {atRisk === 1 ? 'cliente em risco' : 'clientes em risco'}
    </p>
  )
}

export function LifecycleStageCard({ metrics }: LifecycleStageCardProps) {
  const config = LIFECYCLE_STAGE_CONFIG[metrics.stage]
  const Icon = config.icon
  const variation = formatVariation(metrics.periodCount, metrics.prevPeriodCount)

  const badgeVariant = (() => {
    if (metrics.periodCount === 0 && metrics.prevPeriodCount === 0) return 'outline' as const
    if (variation.isPositive) return 'success' as const
    return 'destructive' as const
  })()

  const badgeLabel = (() => {
    if (metrics.periodCount === 0 && metrics.prevPeriodCount === 0) return '—'
    return variation.value
  })()

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <Icon className={`size-4 ${config.colorClassName}`} />
            {config.label}
          </span>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
        <p className="text-3xl font-bold tabular-nums">{metrics.periodCount}</p>
        <div className="space-y-1">
          <StageSubInfo metrics={metrics} />
          <p className="text-xs text-muted-foreground">
            Estoque atual: {metrics.stockCount}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
