import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getAiMetrics } from '@/_data-access/dashboard'
import { AiKpiGrid } from './ai-kpi-grid'
import { AiPlanUsageCard } from './ai-plan-usage-card'
import { AiCreditsChart } from './ai-credits-chart'

interface AiDashboardSectionProps {
  orgId: string
  dateRange: { start: Date; end: Date }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function AiDashboardSection({ orgId, dateRange }: AiDashboardSectionProps) {
  const metrics = await getAiMetrics(orgId)

  return (
    <>
      {/* Row 1: KPIs (2/3) + Plan Usage (1/3) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <AiKpiGrid metrics={metrics} />
        </div>
        <AiPlanUsageCard metrics={metrics} />
      </div>

      {/* Row 2: Credits Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Consumo de Créditos (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AiCreditsChart data={metrics.monthlyHistory} />
        </CardContent>
      </Card>
    </>
  )
}
