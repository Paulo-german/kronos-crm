import { Progress } from '@/_components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatVariation } from '@/_utils/date-range'
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface LostByStageEntry {
  stageId: string
  stageName: string
  position: number
  count: number
  value: number
  prevCount: number
  prevValue: number
}

interface LostByStageCardProps {
  stages: LostByStageEntry[]
  totalLost: number
  totalLostValue: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

export function LostByStageCard({ stages, totalLost, totalLostValue }: LostByStageCardProps) {
  const sortedStages = [...stages].sort((a, b) => b.count - a.count)
  const maxCount = sortedStages.length > 0 ? sortedStages[0].count : 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Perdas por Estágio</CardTitle>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{totalLost} perdas</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalLostValue)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {sortedStages.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhuma perda no período</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sortedStages.map((stage) => {
              const progressValue = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
              const variation = formatVariation(stage.count, stage.prevCount)

              return (
                <li key={stage.stageId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium" title={stage.stageName}>
                      {stage.stageName}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Delta count */}
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
                      {/* Contagem + valor */}
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {stage.count}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatCurrency(stage.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={progressValue}
                    className="h-1.5"
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
