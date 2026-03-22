import { DollarSign, TrendingUp, Target, Users } from 'lucide-react'
import type { MemberRole } from '@prisma/client'
import { getKpiMetrics } from '@/_data-access/dashboard'
import type { DateRange } from '@/_data-access/dashboard'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation, getPreviousPeriod } from '@/_utils/date-range'
import { KpiCard } from './kpi-card'

interface KpiGridProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  orgSlug: string
}

export async function KpiGrid({ ctx, dateRange, orgSlug }: KpiGridProps) {
  const prevRange = getPreviousPeriod(dateRange)
  const kpi = await getKpiMetrics(ctx, dateRange, prevRange)

  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      <KpiCard
        title="Valor do Pipeline"
        value={formatCurrency(kpi.totalPipelineValue)}
        icon={DollarSign}
        href={`/org/${orgSlug}/crm/deals/pipeline`}
        iconClassName="text-emerald-500"
        iconBgClassName="bg-emerald-500/10"
      />
      <KpiCard
        title="Receita do Período"
        value={formatCurrency(kpi.wonDealsValue)}
        icon={TrendingUp}
        variation={formatVariation(kpi.wonDealsValue, kpi.prevWonDealsValue)}
        href={`/org/${orgSlug}/crm/deals/list?status=WON`}
        iconClassName="text-primary"
        iconBgClassName="bg-primary/10"
      />
      <KpiCard
        title="Ticket Médio"
        value={formatCurrency(kpi.avgTicket)}
        icon={Target}
        variation={formatVariation(kpi.avgTicket, kpi.prevAvgTicket)}
        href={`/org/${orgSlug}/crm/deals/list?status=WON`}
        iconClassName="text-amber-500"
        iconBgClassName="bg-amber-500/10"
      />
      <KpiCard
        title="Novos Leads"
        value={String(kpi.newLeadsCount)}
        icon={Users}
        variation={formatVariation(kpi.newLeadsCount, kpi.prevNewLeadsCount)}
        href={`/org/${orgSlug}/crm/deals/list?status=OPEN`}
        iconClassName="text-sky-500"
        iconBgClassName="bg-sky-500/10"
      />
    </div>
  )
}
