import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getLostDealsAnalysis } from '@/_data-access/reports/lost-deals/get-lost-deals-analysis'
import { parseReportsSearchParams } from '@/_data-access/reports/shared/reports-filters'
import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { LostByStageCard } from './_components/lost-by-stage-card'
import { LostByReasonCard } from './_components/lost-by-reason-card'

interface LostDealsReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LostDealsReportPage({ params, searchParams }: LostDealsReportPageProps) {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const { dateRange, filters } = parseReportsSearchParams(resolvedSearchParams)
  const section = findReportSection('lost-deals')

  const analysis = await getLostDealsAnalysis(ctx, dateRange, {
    pipelineId: filters.pipelineId,
    assignee: filters.assignee,
  })

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Perdas'}
        description={section?.description}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <LostByStageCard
          stages={analysis.byStage}
          totalLost={analysis.totalLost}
          totalLostValue={analysis.totalLostValue}
        />
        <LostByReasonCard
          reasons={analysis.byReason}
          totalLost={analysis.totalLost}
          totalLostValue={analysis.totalLostValue}
        />
      </div>
    </div>
  )
}
