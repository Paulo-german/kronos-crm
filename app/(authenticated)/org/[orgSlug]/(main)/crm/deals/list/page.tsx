import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealsPaginated } from '@/_data-access/deal/get-deals'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { parseDealListParams } from './_lib/deal-list-params'
import { DealsListClient } from './_components/deals-list-client'

interface DealsListPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const DealsListPage = async ({ params, searchParams }: DealsListPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const listParams = parseDealListParams(resolvedSearchParams)

  // listParams já inclui pipelineId via parseDealListParams (Zod valida UUID)
  const [pipelines, pipelineRaw] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    getOrgPipeline(ctx.orgId, listParams.pipelineId),
  ])

  const pipeline = pipelineRaw ?? (await createDefaultPipeline({ orgId: ctx.orgId }))

  // Se ?pipelineId=<uuid> aponta para um funil que não existe mais (deletado),
  // getOrgPipeline retorna null e caímos no fallback createDefaultPipeline.
  // Neutralizar o pipelineId stale antes de getDealsPaginated para evitar 0 resultados.
  const effectiveParams = pipelineRaw
    ? listParams
    : { ...listParams, pipelineId: undefined }

  const [result, contacts, members, quota, completedTutorialIds] = await Promise.all([
    getDealsPaginated(ctx, effectiveParams),
    getContacts(ctx),
    getOrganizationMembers(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'deal'),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  return (
    <DealsListClient
      deals={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      stages={pipeline.stages}
      contacts={contacts}
      pipeline={pipeline}
      pipelines={pipelines}
      activePipelineId={pipeline.id}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      withinQuota={quota.withinQuota}
      orgSlug={orgSlug}
      isTutorialCompleted={completedTutorialIds.includes('pipeline')}
    />
  )
}

export default DealsListPage
