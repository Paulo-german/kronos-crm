import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { SettingsClient } from './_components/settings-client'

import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PipelineSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PipelineSettingsPage = async ({ params }: PipelineSettingsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  // Busca pipeline da organização (ou cria se não existir)
  const pipeline = await getOrgPipeline(orgId)

  // Se não existir, cria o pipeline padrão
  const finalPipeline = pipeline || (await createDefaultPipeline({ orgId }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pipeline">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações do Pipeline</h1>
          <p className="text-muted-foreground">
            Gerencie as etapas do seu funil de vendas.
          </p>
        </div>
      </div>

      <SettingsClient pipeline={finalPipeline} />
    </div>
  )
}

export default PipelineSettingsPage
