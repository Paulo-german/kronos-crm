import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getRevenueOverTime } from '@/_data-access/dashboard'
import type { DashboardFilters, DateRange } from '@/_data-access/dashboard/types'
import { RevenueAreaChart } from './revenue-area-chart'

interface ChartsSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: DashboardFilters
}

export async function ChartsSection({ ctx, dateRange, filters }: ChartsSectionProps) {
  const revenueData = await getRevenueOverTime(ctx, dateRange, filters)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receita no Período</CardTitle>
      </CardHeader>
      <CardContent>
        <RevenueAreaChart data={revenueData} />
      </CardContent>
    </Card>
  )
}
