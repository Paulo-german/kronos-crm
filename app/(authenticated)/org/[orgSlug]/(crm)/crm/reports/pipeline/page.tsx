import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getProducts } from '@/_data-access/product/get-products'
import { getFunnelDataForReports } from '@/_data-access/reports/pipeline/get-funnel-data-for-reports'
import { getPipelineVelocity } from '@/_data-access/reports/pipeline/get-pipeline-velocity'
import { getDealsAtRisk } from '@/_data-access/reports/pipeline/get-deals-at-risk'
import { parseReportsSearchParams } from '@/_data-access/reports/shared/reports-filters'
import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { findReportSection } from '@/_components/reports/_config/report-sections'
import { ReportsSectionHeader } from '@/_components/reports/_components/reports-section-header'
import { PipelineFilters } from '@/_components/reports/pipeline/_components/pipeline-filters'
import { PipelineFunnelCard } from '@/_components/reports/pipeline/_components/pipeline-funnel-card'
import { PipelineVelocityCard } from '@/_components/reports/pipeline/_components/pipeline-velocity-card'
import { PipelineDealsAtRiskCard } from '@/_components/reports/pipeline/_components/pipeline-deals-at-risk-card'
import { PipelineGoalsStrip } from '@/_components/reports/pipeline/_components/pipeline-goals-strip'

interface PipelineReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function VelocityCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border/40 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function PipelineReportPage({ params, searchParams }: PipelineReportPageProps) {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const { dateRange, filters } = parseReportsSearchParams(resolvedSearchParams)
  const section = findReportSection('pipeline')
  const inactiveDays = Number(resolvedSearchParams.inactiveDays) || 14

  const [pipelines, products, funnelData, velocityData, dealsAtRiskData] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    getProducts(ctx.orgId),
    getFunnelDataForReports(ctx, dateRange, filters),
    getPipelineVelocity(ctx, dateRange, filters),
    getDealsAtRisk(ctx, {
      inactiveDays,
      pipelineId: filters.pipelineId,
      assignee: filters.assignee,
    }),
  ])

  const pipelineOptions = pipelines.map((pipeline) => ({
    id: pipeline.id,
    name: pipeline.name,
  }))

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Pipeline'}
        description={section?.description}
      />

      <PipelineFilters pipelines={pipelineOptions} products={products} />

      <Suspense fallback={<VelocityCardSkeleton />}>
        <PipelineVelocityCard data={velocityData} />
      </Suspense>

      {filters.pipelineId ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PipelineFunnelCard data={funnelData} />
          </div>
          <PipelineDealsAtRiskCard
            deals={dealsAtRiskData.deals}
            total={dealsAtRiskData.total}
            orgSlug={orgSlug}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <PipelineDealsAtRiskCard
              deals={dealsAtRiskData.deals}
              total={dealsAtRiskData.total}
              orgSlug={orgSlug}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Metas de Pipeline</p>
        <Suspense
          fallback={
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/50 px-4 py-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-64" />
            </div>
          }
        >
          <PipelineGoalsStrip ctx={ctx} orgSlug={orgSlug} />
        </Suspense>
      </div>
    </div>
  )
}
