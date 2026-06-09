import { Activity } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { getRecentLifecycleMovement } from '@/_data-access/dashboard-v2/get-recent-lifecycle-movement'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '@/_data-access/dashboard/types'
import { RecentMovementTimelineItem } from './recent-movement-timeline-item'

interface RecentMovementSectionProps {
  ctx: RBACContext
  orgSlug: string
  dateRange: DateRange
}


export async function RecentMovementSection({ ctx, orgSlug, dateRange }: RecentMovementSectionProps) {
  const items = await getRecentLifecycleMovement(ctx, dateRange)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
        <Activity className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Nenhum movimento no período</p>
        <p className="text-xs text-muted-foreground">
          Aumente o intervalo de datas ou aguarde novos contatos.
        </p>
      </div>
    )
  }

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Movimento Recente</h2>
      <Card>
        <CardContent className="pt-4">
          <div className="divide-y divide-border/50">
            {items.map((item) => (
              <RecentMovementTimelineItem key={item.id} item={item} orgSlug={orgSlug} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
