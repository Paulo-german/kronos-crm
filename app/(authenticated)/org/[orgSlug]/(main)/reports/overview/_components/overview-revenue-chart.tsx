import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { RevenueAreaChart } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/revenue-area-chart'
import type { RevenueByMonth } from '@/_data-access/dashboard/types'

interface OverviewRevenueChartProps {
  data: RevenueByMonth[]
}

export function OverviewRevenueChart({ data }: OverviewRevenueChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receita no período</CardTitle>
      </CardHeader>
      <CardContent>
        <RevenueAreaChart data={data} />
      </CardContent>
    </Card>
  )
}
