import { Suspense } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { DASHBOARD_V2_DEFAULT_DAYS } from '@/_lib/lifecycle/dashboard-v2-constants'
import { DateRangePicker } from '../_shared/date-range-picker'
import { LifecycleFunnelSection } from './_components/lifecycle-funnel-section'
import { AttentionSection } from './_components/attention-section'
import { GoalsSection } from './_components/goals-section'
import {
  LifecycleFunnelSkeleton,
  AttentionSectionSkeleton,
  GoalsSectionSkeleton,
} from './_components/skeletons'

interface DashboardV2PageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}

export default async function DashboardV2Page({ params, searchParams }: DashboardV2PageProps) {
  const { orgSlug } = await params
  const { start, end } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  // parseDateRange não suporta defaultDays: quando ausentes, usa o mês corrente.
  // Para o v2 o default é os últimos 30 dias — calculamos manualmente quando
  // start/end estão ausentes.
  const dateRange = start ?? end
    ? parseDateRange(start, end)
    : {
        start: startOfDay(subDays(new Date(), DASHBOARD_V2_DEFAULT_DAYS - 1)),
        end: endOfDay(new Date()),
      }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-end">
        <DateRangePicker defaultLabel="Últimos 30 dias" />
      </div>
      <Suspense
        key={`${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
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
    </div>
  )
}
