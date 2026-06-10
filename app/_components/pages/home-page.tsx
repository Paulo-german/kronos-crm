import { Suspense } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { DASHBOARD_V2_DEFAULT_DAYS } from '@/_lib/lifecycle/dashboard-v2-constants'
import { parseDateRange } from '@/_utils/date-range'
import { deriveFirstName } from '@/_components/home/_lib/derive-first-name'
import HomeGreeting from '@/_components/home/_components/home-greeting'
import PlatformMap from '@/_components/home/_components/platform-map'
import EcosystemGrid from '@/_components/home/_components/ecosystem-grid'
import AnimatedSection from '@/_components/home/_components/animated-section'
import HomeTipsStrip from '@/_components/home/_components/home-tips-strip'
import { DateRangePicker } from '@/_components/dashboard/_shared/date-range-picker'
import { LastUpdatedLabel } from '@/_components/home/_components/last-updated-label'
import { LifecycleFunnelSection } from '@/_components/dashboard/v2/_components/lifecycle-funnel-section'
import { RecentMovementSection } from '@/_components/dashboard/v2/_components/recent-movement-section'
import {
  LifecycleFunnelSkeleton,
  RecentMovementSkeleton,
} from '@/_components/dashboard/v2/_components/skeletons'

interface HomePageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}

const HomePage = async ({ params, searchParams }: HomePageProps) => {
  const { orgSlug } = await params
  const { start, end } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const user = await getUserById(ctx.userId)
  const firstName = deriveFirstName(user?.fullName ?? null, user?.email ?? '')

  const now = new Date()
  const dateRange =
    (start ?? end)
      ? parseDateRange(start, end)
      : {
          start: startOfDay(subDays(now, DASHBOARD_V2_DEFAULT_DAYS - 1)),
          end: endOfDay(now),
        }

  return (
    <div className="flex flex-col gap-8 p-6">
      <AnimatedSection delay={0}>
        <HomeGreeting firstName={firstName} />
      </AnimatedSection>
      <AnimatedSection delay={0.08}>
        <HomeTipsStrip />
      </AnimatedSection>
      <AnimatedSection delay={0.16}>
        <div data-tour="home-funnel" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <LastUpdatedLabel isoTimestamp={now.toISOString()} />
            <DateRangePicker defaultLabel="Últimos 30 dias" />
          </div>
          <Suspense
            key={`funnel-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
            fallback={<LifecycleFunnelSkeleton />}
          >
            <LifecycleFunnelSection ctx={ctx} dateRange={dateRange} />
          </Suspense>
        </div>
      </AnimatedSection>
      <AnimatedSection delay={0.24}>
        <Suspense
          key={`recent-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`}
          fallback={<RecentMovementSkeleton />}
        >
          <RecentMovementSection
            ctx={ctx}
            orgSlug={orgSlug}
            dateRange={dateRange}
          />
        </Suspense>
      </AnimatedSection>
      <AnimatedSection delay={0.32}>
        <div className="flex w-full justify-center">
          <PlatformMap />
        </div>
      </AnimatedSection>
      <AnimatedSection delay={0.4}>
        <EcosystemGrid />
      </AnimatedSection>
    </div>
  )
}

export default HomePage
