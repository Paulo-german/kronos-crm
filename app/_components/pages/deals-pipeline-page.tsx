import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getDealsByPipeline } from '@/_data-access/deal/get-deals-by-pipeline'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { PipelineIntroTrigger } from '@/_components/tutorials/pipeline-intro-trigger'
import { PipelineClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/pipeline/_components/pipeline-client'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

interface DealsPipelinePageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ pipelineId?: string }>
}

const DealsPipelinePage = async ({ params, searchParams }: DealsPipelinePageProps) => {
  const { orgSlug } = await params
  const { pipelineId: selectedPipelineId } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const [pipelines, pipeline] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    getOrgPipeline(ctx.orgId, selectedPipelineId || undefined),
  ])

  const finalPipeline =
    pipeline || (await createDefaultPipeline({ orgId: ctx.orgId }))

  const [dealsByStage, orgMembers, completedTutorialIds] = await Promise.all([
    finalPipeline
      ? getDealsByPipeline(
          finalPipeline.stages.map((stage) => stage.id),
          ctx,
        )
      : {},
    getOrganizationMembers(ctx.orgId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  const members = orgMembers.accepted
    .filter((member) => member.userId && member.user?.fullName)
    .map((member) => ({ userId: member.userId!, name: member.user!.fullName! }))

  return (
    <>
      <div className="flex h-full flex-col space-y-6 overflow-hidden">
        <PipelineClient
          pipeline={finalPipeline}
          pipelines={pipelines}
          activePipelineId={finalPipeline?.id ?? ''}
          dealsByStage={dealsByStage}
          members={members}
          currentUserId={ctx.userId}
          userRole={ctx.userRole}
        />
      </div>
      <PipelineIntroTrigger
        hasSeenPipelineIntro={completedTutorialIds.includes('pipeline')}
      />
    </>
  )
}

export default DealsPipelinePage
