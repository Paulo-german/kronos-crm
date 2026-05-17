import { Progress } from '@/_components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatVariation } from '@/_utils/date-range'
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface LostByReasonEntry {
  reasonId: string
  reasonLabel: string
  count: number
  value: number
  prevCount: number
  prevValue: number
}

interface LostByReasonCardProps {
  reasons: LostByReasonEntry[]
  totalLost: number
  totalLostValue: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

export function LostByReasonCard({ reasons, totalLost, totalLostValue }: LostByReasonCardProps) {
  // "Sem motivo" (reasonId: 'unknown') sempre por último
  const sortedReasons = [...reasons].sort((a, b) => {
    if (a.reasonId === 'unknown') return 1
    if (b.reasonId === 'unknown') return -1
    return b.count - a.count
  })

  const maxCount = sortedReasons.length > 0 ? (sortedReasons[0].reasonId !== 'unknown' ? sortedReasons[0].count : 0) : 0
  const effectiveMax = maxCount > 0 ? maxCount : Math.max(...sortedReasons.map((reason) => reason.count), 0)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Perdas por Motivo</CardTitle>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{totalLost} perdas</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalLostValue)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {sortedReasons.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhuma perda no período</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedReasons.map((reason) => {
              const progressValue = effectiveMax > 0 ? (reason.count / effectiveMax) * 100 : 0
              const variation = formatVariation(reason.count, reason.prevCount)
              const isUnknown = reason.reasonId === 'unknown'

              return (
                <li key={reason.reasonId} className={cn('space-y-1.5', isUnknown && 'opacity-60')}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        isUnknown ? 'italic text-muted-foreground' : 'font-medium',
                      )}
                      title={reason.reasonLabel}
                    >
                      {reason.reasonLabel}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Delta count */}
                      {!isUnknown && (
                        <span
                          className={cn(
                            'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                            variation.isPositive
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                          )}
                        >
                          {variation.isPositive ? (
                            <TrendingUp className="size-2.5" />
                          ) : (
                            <TrendingDown className="size-2.5" />
                          )}
                          {variation.value}
                        </span>
                      )}
                      {/* Contagem + valor */}
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {reason.count}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatCurrency(reason.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={progressValue}
                    className={cn('h-1.5', isUnknown && '[&>div]:bg-muted-foreground')}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
