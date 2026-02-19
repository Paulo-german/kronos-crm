import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getDealsByStatus } from '@/_data-access/dashboard'
import { PipelineDonutChart } from './pipeline-donut-chart'
import { DEAL_STATUS_CONFIG, DEAL_STATUS_ORDER } from './deal-status-config'

interface PipelineStatusSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
}

export async function PipelineStatusSection({
  ctx,
}: PipelineStatusSectionProps) {
  const data = await getDealsByStatus(ctx)

  const filteredData = data.filter((d) => d.status !== 'PAUSED')
  const countMap = new Map(data.map((d) => [d.status, d.count]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status do Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <PipelineDonutChart data={filteredData} />
          </div>
          <div className="flex-1 space-y-2.5">
            {DEAL_STATUS_ORDER.map((status) => {
              const config = DEAL_STATUS_CONFIG[status]
              const count = countMap.get(status) ?? 0

              return (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {config.label}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
