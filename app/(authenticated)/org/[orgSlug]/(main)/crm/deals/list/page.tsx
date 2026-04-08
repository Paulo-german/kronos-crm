import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealsPaginated } from '@/_data-access/deal/get-deals'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
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

  const pipelineRaw = await getOrgPipeline(ctx.orgId)
  const pipeline = pipelineRaw ?? (await createDefaultPipeline({ orgId: ctx.orgId }))

  const [result, contacts, members, quota, completedTutorialIds] = await Promise.all([
    getDealsPaginated(ctx, listParams),
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
