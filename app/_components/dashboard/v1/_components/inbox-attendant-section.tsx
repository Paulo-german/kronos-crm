import type { MemberRole } from '@prisma/client'
import { isElevated } from '@/_lib/rbac/permissions'
import { getAttendantPerformance } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { InfoTooltip } from '@/_components/ui/info-tooltip'
import { InboxAttendantChart } from './inbox-attendant-chart'

interface InboxAttendantSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxAttendantSection({
  ctx,
  dateRange,
  filters,
}: InboxAttendantSectionProps) {
  // Guard: apenas elevated. O data-access também guarda, mas fazemos early return aqui
  // para evitar o fetch desnecessário (o componente só é renderizado se elevated=true)
  if (!isElevated(ctx.userRole)) return null

  const data = await getAttendantPerformance(ctx, dateRange, filters)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
          Performance por Atendente
          <InfoTooltip>
            Ranking dos atendentes por volume de conversas, com o tempo médio de
            1ª resposta e a taxa de resolução de cada um.
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InboxAttendantChart data={data} />
      </CardContent>
    </Card>
  )
}
