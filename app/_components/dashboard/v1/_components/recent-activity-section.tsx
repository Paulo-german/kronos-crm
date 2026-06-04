import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getRecentActivities } from '@/_data-access/dashboard'
import { RecentActivityList } from './recent-activity-list'

interface RecentActivitySectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  orgSlug: string
}

export async function RecentActivitySection({
  ctx,
  orgSlug,
}: RecentActivitySectionProps) {
  const activities = await getRecentActivities(ctx)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Atividade Recente</CardTitle>
        <Link
          href={`/org/${orgSlug}/crm/deals/pipeline`}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver todas
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <RecentActivityList activities={activities} />
      </CardContent>
    </Card>
  )
}
