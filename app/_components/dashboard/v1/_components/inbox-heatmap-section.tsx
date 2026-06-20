import type { MemberRole } from '@prisma/client'
import { getHourlyHeatmap } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { InfoTooltip } from '@/_components/ui/info-tooltip'
import { InboxHeatmapGrid } from './inbox-heatmap-grid'

interface InboxHeatmapSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxHeatmapSection({
  ctx,
  dateRange,
  filters,
}: InboxHeatmapSectionProps) {
  const data = await getHourlyHeatmap(ctx, dateRange, filters)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
          Horários de Pico
          <InfoTooltip>
            Concentração de mensagens recebidas por dia da semana e hora, no
            horário de Brasília. Útil para escalar a equipe nos momentos de
            maior demanda.
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InboxHeatmapGrid data={data} />
      </CardContent>
    </Card>
  )
}
