import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import type { formatVariation } from '@/_utils/date-range'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'

export interface MetricCardProps {
  title: string
  value: string
  variation?: ReturnType<typeof formatVariation>
  // Quando true, queda = verde e alta = vermelha (ex: deals perdidos — menos é melhor).
  invertPolarity?: boolean
  footnote?: string
}

export function MetricCard({
  title,
  value,
  variation,
  invertPolarity,
  footnote,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-xl font-bold">{value}</p>
        {variation && (
          <VariationBadge
            variation={variation}
            invertPolarity={invertPolarity}
            className="ml-0 mt-1"
          />
        )}
        {footnote && (
          <p className="mt-1 text-[10px] text-muted-foreground">{footnote}</p>
        )}
      </CardContent>
    </Card>
  )
}
