import { Suspense } from 'react'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { DASHBOARD_V2_DEFAULT_DAYS } from '@/_lib/lifecycle/dashboard-v2-constants'
import { DateRangePicker } from '@/_components/dashboard/_shared/date-range-picker'
import { LifecycleFunnelSection } from '@/_components/dashboard/v2/_components/lifecycle-funnel-section'
import { AttentionSection } from '@/_components/dashboard/v2/_components/attention-section'
import { GoalsSection } from '@/_components/dashboard/v2/_components/goals-section'
import { RecentMovementSection } from '@/_components/dashboard/v2/_components/recent-movement-section'
import {
  LifecycleFunnelSkeleton,
  AttentionSectionSkeleton,
  GoalsSectionSkeleton,
  RecentMovementSkeleton,
} from '@/_components/dashboard/v2/_components/skeletons'

interface DashboardV2PageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}

const DashboardV2Page = async ({ params, searchParams }: DashboardV2PageProps) => {
  const { orgSlug } = await params
  const { start, end } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const now = new Date()
  const dateRange = (start ?? end)
    ? parseDateRange(start, end)
    : {
        start: startOfDay(subDays(now, DASHBOARD_V2_DEFAULT_DAYS - 1)),
        end: endOfDay(now),
      }

  const updatedAtLabel = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Atualizado em {updatedAtLabel}</span>
        <DateRangePicker defaultLabel="Últimos 30 dias" />
      </div>
      <Suspense
        key={`funnel-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
        fallback={<LifecycleFunnelSkeleton />}
      >
        <LifecycleFunnelSection ctx={ctx} dateRange={dateRange} />
      </Suspense>
      <Suspense fallback={<AttentionSectionSkeleton />}>
        <AttentionSection ctx={ctx} orgSlug={orgSlug} />
      </Suspense>
      <Suspense fallback={<GoalsSectionSkeleton />}>
        <GoalsSection ctx={ctx} orgSlug={orgSlug} />
      </Suspense>
      <Suspense
        key={`recent-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
        fallback={<RecentMovementSkeleton />}
      >
        <RecentMovementSection ctx={ctx} orgSlug={orgSlug} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}

export default DashboardV2Page
