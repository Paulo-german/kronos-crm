import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealsPaginated } from '@/_data-access/deal/get-deals'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import { parseDealListParams } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/list/_lib/deal-list-params'
import { DealsListClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/list/_components/deals-list-client'

interface DealsListPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const DealsListPage = async ({ params, searchParams }: DealsListPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const listParams = parseDealListParams(resolvedSearchParams)

  const [pipelines, pipelineRaw] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    getOrgPipeline(ctx.orgId, listParams.pipelineId),
  ])

  const pipeline = pipelineRaw ?? (await createDefaultPipeline({ orgId: ctx.orgId }))

  // Garante que effectiveParams sempre carrega um pipelineId resolvido:
  // - URL sem pipelineId → usa o pipeline default/fallback resolvido
  // - URL com pipelineId deletado (pipelineRaw null) → neutraliza para evitar 0 resultados
  const effectiveParams = {
    ...listParams,
    pipelineId: pipelineRaw ? (listParams.pipelineId ?? pipeline.id) : undefined,
  }

  const [result, members, quota] = await Promise.all([
    getDealsPaginated(ctx, effectiveParams),
    getOrganizationMembers(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'deal'),
  ])

  return (
    <DealsListClient
      deals={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      stages={pipeline.stages}
      pipeline={pipeline}
      pipelines={pipelines}
      activePipelineId={pipeline.id}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      withinQuota={quota.withinQuota}
      orgSlug={orgSlug}
    />
  )
}

export default DealsListPage
