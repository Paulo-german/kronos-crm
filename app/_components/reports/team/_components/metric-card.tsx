import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import type { formatVariation } from '@/_utils/date-range'

export interface MetricCardProps {
  title: string
  value: string
  variation?: ReturnType<typeof formatVariation>
  // Quando true, queda = verde e alta = vermelha (ex: deals perdidos — menos é melhor).
  invertPolarity?: boolean
  footnote?: string
}

export function MetricCard({ title, value, variation, invertPolarity, footnote }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-xl font-bold">{value}</p>
        {variation && (
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              (invertPolarity ? !variation.isPositive : variation.isPositive)
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
            )}
          >
            {variation.isPositive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {variation.value}
          </span>
        )}
        {footnote && (
          <p className="mt-1 text-[10px] text-muted-foreground">{footnote}</p>
        )}
      </CardContent>
    </Card>
  )
}
