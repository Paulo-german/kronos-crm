import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getFunnelData } from '@/_data-access/dashboard'
import type { DashboardFilters, DateRange } from '@/_data-access/dashboard/types'
import { PipelineFunnel } from './pipeline-funnel'

interface FunnelSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: DashboardFilters
}

export async function FunnelSection({ ctx, dateRange, filters }: FunnelSectionProps) {
  const funnelData = await getFunnelData(ctx, dateRange, filters)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <PipelineFunnel stages={funnelData} />
      </CardContent>
    </Card>
  )
}
