import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { Badge } from '@/_components/ui/badge'
import { BackButton } from '@/_components/layout/back-button'
import { PipelineDetailClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/pipelines/[pipelineId]/_components/pipeline-detail-client'

interface PipelineDetailPageProps {
  params: Promise<{ orgSlug: string; pipelineId: string }>
}

export default async function PipelineDetailPage({
  params,
}: PipelineDetailPageProps) {
  const { orgSlug, pipelineId } = await params
  const ctx = await getOrgContext(orgSlug)

  const pipeline = await getOrgPipeline(ctx.orgId, pipelineId)

  if (!pipeline) {
    redirect(`/org/${orgSlug}/crm/settings/pipelines`)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <BackButton href={`/org/${orgSlug}/crm/settings/pipelines`} />
      </div>
      {/* Título + badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{pipeline.name}</h1>
        {pipeline.isDefault && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Padrão
          </Badge>
        )}
      </div>

      {/* Componente client com as tabs */}
      <PipelineDetailClient pipeline={pipeline} />
    </div>
  )
}
