import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getDealsByPipeline } from '@/_data-access/deal/get-deals-by-pipeline'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { PipelineClient } from './_components/pipeline-client'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

interface PipelinePageProps {
  params: Promise<{ orgSlug: string }>
}

const PipelinePage = async ({ params }: PipelinePageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Busca pipeline da organização (ou cria se não existir)
  const pipeline = await getOrgPipeline(ctx.orgId)

  // Se não existir, cria o pipeline padrão
  const finalPipeline =
    pipeline || (await createDefaultPipeline({ orgId: ctx.orgId }))

  // Busca deals, contatos e membros em paralelo (com contexto RBAC)
  const [dealsByStage, contacts, orgMembers] = await Promise.all([
    finalPipeline
      ? getDealsByPipeline(
          finalPipeline.stages.map((s) => s.id),
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
