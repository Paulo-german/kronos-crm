import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getDealsByPipeline } from '@/_data-access/deal/get-deals-by-pipeline'
import { getContacts } from '@/_data-access/contact/get-contacts'
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

  // Busca deals e contatos em paralelo (com contexto RBAC)
  const [dealsByStage, contacts] = await Promise.all([
    finalPipeline
      ? getDealsByPipeline(
          finalPipeline.stages.map((s) => s.id),
          ctx,
        )
      : {},
    getContacts(ctx),
  ])

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col space-y-4">
      <PipelineClient
        pipeline={finalPipeline}
        dealsByStage={dealsByStage}
        contacts={contacts}
        userRole={ctx.userRole}
      />
    </div>
  )
}

export default PipelinePage
