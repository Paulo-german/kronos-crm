import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { GoalRevenueBreakdown } from './goal-revenue-breakdown'
import type { GoalProgressCardProps } from './goal-progress-card.types'

const GOAL_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Receita',
  DEALS_CLOSED: 'Negócios fechados',
  DEALS_OPENED: 'Negócios abertos',
  ACTIVITIES: 'Atividades',
  CONVERSATIONS: 'Conversas',
}

const GOAL_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
}

function formatValue(value: number, isRevenue: boolean): string {
  if (isRevenue) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

function getBarColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-destructive'
}

export function GoalProgressCard({
  goal,
  progress,
  showBreakdown = false,
  variant = 'default',
  primaryAction,
}: GoalProgressCardProps) {
  const isRevenue = goal.type === 'REVENUE'
  const barColor = getBarColor(progress.percent)
  const percentDisplay =
    progress.percent >= 999 ? '999%+' : `${Math.round(progress.percent)}%`

  if (variant === 'compact') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
            </p>
            <p className="text-xs text-muted-foreground">
              {GOAL_PERIOD_LABELS[goal.period] ?? goal.period}
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {percentDisplay}
          </span>
        </div>
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(progress.actual, isRevenue)}</span>
          <span>{formatValue(progress.target, isRevenue)}</span>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {GOAL_PERIOD_LABELS[goal.period] ?? goal.period}
              </Badge>
              {goal.scope !== 'ORG' && (
                <span className="text-xs text-muted-foreground">
                  {goal.scope === 'PIPELINE' && goal.targetPipelineName
                    ? goal.targetPipelineName
                    : goal.targetUserName ?? ''}
                </span>
              )}
            </div>
          </div>
          <span
            className={`text-2xl font-bold tabular-nums ${
              progress.percent >= 100
                ? 'text-emerald-500'
                : progress.percent >= 70
                  ? 'text-amber-500'
                  : 'text-destructive'
            }`}
          >
            {percentDisplay}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de progresso */}
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>
              {formatValue(progress.actual, isRevenue)} realizados
            </span>
            <span>Meta: {formatValue(progress.target, isRevenue)}</span>
          </div>
        </div>

        {/* Dias restantes */}
        {progress.daysRemaining > 0 && (
          <p className="text-xs text-muted-foreground">
            {progress.daysRemaining}{' '}
            {progress.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
          </p>
        )}

        {/* Breakdown de receita */}
        {showBreakdown && isRevenue && (
          <GoalRevenueBreakdown breakdown={progress.breakdown} />
        )}

        {/* Ação primária */}
        {primaryAction && (
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
