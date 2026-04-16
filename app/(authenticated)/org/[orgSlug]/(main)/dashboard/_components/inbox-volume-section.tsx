import type { MemberRole } from '@prisma/client'
import { getConversationVolume } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { InboxVolumeChart } from './inbox-volume-chart'

interface InboxVolumeSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxVolumeSection({
  ctx,
  dateRange,
  filters,
}: InboxVolumeSectionProps) {
  const data = await getConversationVolume(ctx, dateRange, filters)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Volume de Conversas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InboxVolumeChart data={data} />
      </CardContent>
    </Card>
  )
}
