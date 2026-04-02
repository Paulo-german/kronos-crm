import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { PipelineDetailClient } from './_components/pipeline-detail-client'

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
    redirect(`/org/${orgSlug}/settings/pipelines`)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Voltar */}
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={`/org/${orgSlug}/settings/pipelines`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Funis de Vendas
        </Link>
      </Button>

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
