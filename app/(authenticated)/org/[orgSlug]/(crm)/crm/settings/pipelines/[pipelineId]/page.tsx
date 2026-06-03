import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { Badge } from '@/_components/ui/badge'
import { PipelineDetailClient } from '@/(authenticated)/org/[orgSlug]/(main)/settings/pipelines/[pipelineId]/_components/pipeline-detail-client'

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
      {/* Título + badges */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{pipeline.name}</h1>
        {pipeline.isDefault && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Star className="mr-1 h-3 w-3" />
            Padrão
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {pipeline.stages.length} etapas
        </Badge>
      </div>

      {/* Componente client com as tabs */}
      <PipelineDetailClient pipeline={pipeline} />
    </div>
  )
}
