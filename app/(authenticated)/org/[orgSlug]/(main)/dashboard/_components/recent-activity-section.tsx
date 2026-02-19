import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getRecentActivities } from '@/_data-access/dashboard'
import { RecentActivityList } from './recent-activity-list'

interface RecentActivitySectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
}

export async function RecentActivitySection({
  ctx,
}: RecentActivitySectionProps) {
  const activities = await getRecentActivities(ctx)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <RecentActivityList activities={activities} />
      </CardContent>
    </Card>
  )
}
