import { getLifecycleFunnelMetrics } from '@/_data-access/dashboard-v2/get-lifecycle-funnel-metrics'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '@/_data-access/dashboard/types'
import { LifecycleStageCard } from './lifecycle-stage-card'
import { LifecycleEvolutionChart } from './lifecycle-evolution-chart'

interface LifecycleFunnelSectionProps {
  ctx: RBACContext
  dateRange: DateRange
}

export async function LifecycleFunnelSection({ ctx, dateRange }: LifecycleFunnelSectionProps) {
  const metrics = await getLifecycleFunnelMetrics(ctx, dateRange)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.stages.map((stageMetrics) => (
          <LifecycleStageCard key={stageMetrics.stage} metrics={stageMetrics} />
        ))}
      </div>
      <LifecycleEvolutionChart data={metrics.evolutionByMonth} />
    </div>
  )
}
