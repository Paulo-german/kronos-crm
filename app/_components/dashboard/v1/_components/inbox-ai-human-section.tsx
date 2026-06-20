import type { MemberRole } from '@prisma/client'
import { getAiHumanBreakdown } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { InfoTooltip } from '@/_components/ui/info-tooltip'
import { InboxAiHumanChart } from './inbox-ai-human-chart'

interface InboxAiHumanSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxAiHumanSection({
  ctx,
  dateRange,
  filters,
}: InboxAiHumanSectionProps) {
  const breakdown = await getAiHumanBreakdown(ctx, dateRange, filters)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
          IA vs Humano
          <InfoTooltip>
            Quantas conversas a IA atendeu sozinha, quantas precisaram ser
            passadas para um humano (handoff) e a taxa de sucesso da IA
            (resolvidas sem precisar de humano).
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <InboxAiHumanChart breakdown={breakdown} />
      </CardContent>
    </Card>
  )
}
