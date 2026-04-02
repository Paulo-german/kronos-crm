import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getDealsByPipeline } from '@/_data-access/deal/get-deals-by-pipeline'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { PipelineClient } from './_components/pipeline-client'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

interface PipelinePageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ pipelineId?: string }>
}

const PipelinePage = async ({ params, searchParams }: PipelinePageProps) => {
  const { orgSlug } = await params
  const { pipelineId: selectedPipelineId } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  // Busca lista de pipelines (para seletor) + pipeline ativo em paralelo
  const [pipelines, pipeline] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    getOrgPipeline(ctx.orgId, selectedPipelineId || undefined),
  ])

  // Se não existir pipeline ativo, cria o default
  const finalPipeline =
    pipeline || (await createDefaultPipeline({ orgId: ctx.orgId }))

  // Busca deals, contatos e membros em paralelo (com contexto RBAC)
  const [dealsByStage, contacts, orgMembers] = await Promise.all([
    finalPipeline
      ? getDealsByPipeline(
          finalPipeline.stages.map((stage) => stage.id),
          ctx,
        )
      : {},
    getContacts(ctx),
    getOrganizationMembers(ctx.orgId),
  ])

  const members = orgMembers.accepted
    .filter((member) => member.userId && member.user?.fullName)
    .map((member) => ({ userId: member.userId!, name: member.user!.fullName! }))

  return (
    <div className="flex h-full flex-col space-y-6 overflow-hidden">
      <PipelineClient
        pipeline={finalPipeline}
        pipelines={pipelines}
        activePipelineId={finalPipeline?.id ?? ''}
        dealsByStage={dealsByStage}
        contacts={contacts}
        members={members}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
      />
    </div>
  )
}

export default PipelinePage
