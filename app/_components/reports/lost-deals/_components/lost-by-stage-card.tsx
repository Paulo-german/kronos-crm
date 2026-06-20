import { Progress } from '@/_components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { formatVariation } from '@/_utils/date-range'
import { formatCompactCurrency } from '@/_utils/format-currency'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'
import type { LostDealsByStage } from '@/_data-access/reports/lost-deals/get-lost-deals-analysis'

interface LostByStageCardProps {
  stages: LostDealsByStage[]
  totalLost: number
  totalLostValue: number
}

export function LostByStageCard({
  stages,
  totalLost,
  totalLostValue,
}: LostByStageCardProps) {
  const sortedStages = [...stages].sort(
    (stageA, stageB) => stageB.count - stageA.count,
  )
  const maxCount = sortedStages.length > 0 ? sortedStages[0].count : 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Perdas por Estágio</CardTitle>
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
        {sortedStages.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma perda no período
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedStages.map((stage) => {
              const progressValue =
                maxCount > 0 ? (stage.count / maxCount) * 100 : 0
              const variation = formatVariation(stage.count, stage.prevCount)

              return (
                <li key={stage.stageId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="truncate text-sm font-medium"
                      title={stage.stageName}
                    >
                      {stage.stageName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Delta count — mais perdas = vermelho (invertPolarity) */}
                      <VariationBadge
                        size="xs"
                        invertPolarity
                        variation={variation}
                        className="ml-0"
                      />
                      {/* Contagem + valor */}
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {stage.count}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatCompactCurrency(stage.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress value={progressValue} className="h-1.5" />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
