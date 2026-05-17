import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { parseDateRange } from '@/_utils/date-range'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { AiDashboardSection } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/ai-dashboard-section'
import { AiDashboardSkeleton } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/skeletons'

interface AiReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    start?: string
    end?: string
  }>
}

export default async function AiReportPage({ params, searchParams }: AiReportPageProps) {
  const { orgSlug } = await params
  const { start, end } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)

  const section = findReportSection('ai')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'IA'}
        description={section?.description}
      />

      <Suspense fallback={<AiDashboardSkeleton />}>
        <AiDashboardSection orgId={ctx.orgId} dateRange={dateRange} />
      </Suspense>
    </div>
  )
}
