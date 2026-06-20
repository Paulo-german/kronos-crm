import { Progress } from '@/_components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatVariation } from '@/_utils/date-range'
import { formatCompactCurrency } from '@/_utils/format-currency'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'
import type { LostDealsByReason } from '@/_data-access/reports/lost-deals/get-lost-deals-analysis'

interface LostByReasonCardProps {
  reasons: LostDealsByReason[]
  totalLost: number
  totalLostValue: number
}

export function LostByReasonCard({
  reasons,
  totalLost,
  totalLostValue,
}: LostByReasonCardProps) {
  // "Sem motivo" (reasonId: 'unknown') sempre por último
  const sortedReasons = [...reasons].sort((reasonA, reasonB) => {
    if (reasonA.reasonId === 'unknown') return 1
    if (reasonB.reasonId === 'unknown') return -1
    return reasonB.count - reasonA.count
  })

  const effectiveMax = sortedReasons.reduce(
    (max, reason) => Math.max(max, reason.count),
    0,
  )

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Perdas por Motivo</CardTitle>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {totalLost} perdas
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCompactCurrency(totalLostValue)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {sortedReasons.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma perda no período
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedReasons.map((reason) => {
              const progressValue =
                effectiveMax > 0 ? (reason.count / effectiveMax) * 100 : 0
              const variation = formatVariation(reason.count, reason.prevCount)
              const isUnknown = reason.reasonId === 'unknown'

              return (
                <li
                  key={reason.reasonId}
                  className={cn('space-y-1.5', isUnknown && 'opacity-60')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        isUnknown
                          ? 'italic text-muted-foreground'
                          : 'font-medium',
                      )}
                      title={reason.reasonLabel}
                    >
                      {reason.reasonLabel}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Delta count — mais perdas = vermelho (invertPolarity) */}
                      {!isUnknown && (
                        <VariationBadge
                          size="xs"
                          invertPolarity
                          variation={variation}
                          className="ml-0"
                        />
                      )}
                      {/* Contagem + valor */}
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {reason.count}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatCompactCurrency(reason.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={progressValue}
                    className={cn(
                      'h-1.5',
                      isUnknown && '[&>div]:bg-muted-foreground',
                    )}
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
