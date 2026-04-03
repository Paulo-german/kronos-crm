import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDeals } from '@/_data-access/deal/get-deals'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { DealsDataTable } from './_components/deals-data-table'
import CreateDealButton from '../_components/create-deal-button'
import { ViewToggle } from '../_components/view-toggle'
import { PipelineSettingsButton } from '../_components/pipeline-settings-button'
import { TutorialTriggerButton } from '@/_components/tutorials/tutorial-trigger-button'
import { QuotaHint } from '@/_components/trial/quota-hint'

interface DealsListPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const DealsListPage = async ({ params, searchParams }: DealsListPageProps) => {
  const { orgSlug } = await params
  const { status: statusParam } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const pipelineRaw = await getOrgPipeline(ctx.orgId)
  const pipeline =
    pipelineRaw || (await createDefaultPipeline({ orgId: ctx.orgId }))

  const [deals, contacts, members, quota, completedTutorialIds] = await Promise.all([
    getDeals(ctx),
    getContacts(ctx),
    getOrganizationMembers(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'deal'),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <ViewToggle activeView="list" />
        <QuotaHint orgId={ctx.orgId} entity="deal" />
        <div className="flex-1" />
        <TutorialTriggerButton
          tutorialId="pipeline"
          isCompleted={completedTutorialIds.includes('pipeline')}
        />
        {(ctx.userRole === 'ADMIN' || ctx.userRole === 'OWNER') && (
          <PipelineSettingsButton pipeline={pipeline} />
        )}
        <CreateDealButton
          stages={pipeline.stages}
          contacts={contacts}
          withinQuota={quota.withinQuota}
        />
      </div>
      <DealsDataTable
        deals={deals}
        stages={pipeline.stages}
        contacts={contacts}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
        initialStatusFilter={statusParam}
      />
    </div>
  )
}

export default DealsListPage
