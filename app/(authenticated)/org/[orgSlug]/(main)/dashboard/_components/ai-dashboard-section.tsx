import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getAiMetrics } from '@/_data-access/dashboard'
import { AiKpiGrid } from './ai-kpi-grid'
import { AiPlanUsageCard } from './ai-plan-usage-card'
import { AiUsageBarChart } from './ai-usage-bar-chart'
import { AiAgentBreakdownCard } from './ai-agent-breakdown-card'

interface AiDashboardSectionProps {
  orgId: string
  dateRange: { start: Date; end: Date }
}

export async function AiDashboardSection({ orgId, dateRange }: AiDashboardSectionProps) {
  const metrics = await getAiMetrics(orgId, dateRange)

  return (
    <>
      {/* Row 1: KPIs (2/3) + Plan Usage (1/3) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <AiKpiGrid metrics={metrics} />
        </div>
        <AiPlanUsageCard metrics={metrics} />
      </div>

      {/* Row 2: Bar Chart Créditos + Mensagens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Consumo no Período</CardTitle>
        </CardHeader>
        <CardContent>
          <AiUsageBarChart data={metrics.monthlyHistory} />
        </CardContent>
      </Card>

      {/* Row 3: Breakdown por agente (só renderiza se houver dados) */}
      {metrics.agentBreakdown.length > 0 && (
        <AiAgentBreakdownCard data={metrics.agentBreakdown} />
      )}
    </>
  )
}
