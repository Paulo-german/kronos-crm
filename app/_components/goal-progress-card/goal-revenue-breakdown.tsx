import type { GoalProgressBreakdown } from '@/_data-access/goal/shared/goal-types'

interface GoalRevenueBreakdownProps {
  breakdown: GoalProgressBreakdown
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function GoalRevenueBreakdown({ breakdown }: GoalRevenueBreakdownProps) {
  if (breakdown.oneTimeRevenue === null && breakdown.recurringRevenue === null) {
    return null
  }

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
      {breakdown.oneTimeRevenue !== null && (
        <>
          <dt className="text-muted-foreground">Receita pontual</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatBRL(breakdown.oneTimeRevenue)}
          </dd>
        </>
      )}
      {breakdown.recurringRevenue !== null && (
        <>
          <dt className="text-muted-foreground">Receita recorrente</dt>
          <dd className="text-right font-medium tabular-nums">
            {formatBRL(breakdown.recurringRevenue)}
          </dd>
        </>
      )}
    </dl>
  )
}
