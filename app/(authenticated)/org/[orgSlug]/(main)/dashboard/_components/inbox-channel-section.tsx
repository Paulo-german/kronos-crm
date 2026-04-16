import type { MemberRole } from '@prisma/client'
import { getChannelDistribution } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { InboxChannelDonutChart } from './inbox-channel-donut-chart'

interface InboxChannelSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxChannelSection({
  ctx,
  dateRange,
  filters,
}: InboxChannelSectionProps) {
  const data = await getChannelDistribution(ctx, dateRange, filters)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Distribuição por Canal
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center">
        <InboxChannelDonutChart data={data} />
      </CardContent>
    </Card>
  )
}
