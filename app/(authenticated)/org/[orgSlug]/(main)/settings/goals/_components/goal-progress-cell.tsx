'use client'

import type { GoalProgress } from '@/_data-access/goal/shared/goal-types'

interface GoalProgressCellProps {
  progress: GoalProgress
}

function formatProgressText(progress: GoalProgress): string {
  // Detecta REVENUE pela presença de breakdown com oneTimeRevenue
  const isRevenue = progress.breakdown.oneTimeRevenue !== null

  if (isRevenue) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(progress.actual)
  }

  return new Intl.NumberFormat('pt-BR').format(Math.round(progress.actual))
}

export function GoalProgressCell({ progress }: GoalProgressCellProps) {
  const barColor =
    progress.percent >= 100
      ? 'bg-emerald-500'
      : progress.percent >= 70
        ? 'bg-amber-500'
        : 'bg-destructive'

  const percentDisplay =
    progress.percent >= 999 ? '999%+' : `${Math.round(progress.percent)}%`

  return (
    <div className="flex w-48 flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, progress.percent)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatProgressText(progress)}</span>
        <span>{percentDisplay}</span>
      </div>
    </div>
  )
}
