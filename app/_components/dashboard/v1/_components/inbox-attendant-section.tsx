import type { MemberRole } from '@prisma/client'
import { isElevated } from '@/_lib/rbac/permissions'
import { getAttendantPerformance } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
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
        <CardTitle className="text-base font-semibold">
          Performance por Atendente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InboxAttendantChart data={data} />
      </CardContent>
    </Card>
  )
}
