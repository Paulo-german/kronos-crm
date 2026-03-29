import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAutomationById } from '@/_data-access/automation/get-automation-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getPipelineStages } from '@/_data-access/pipeline/get-pipeline-stages'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { Button } from '@/_components/ui/button'

import { AutomationDetailClient } from './_components/automation-detail-client'

interface AutomationDetailPageProps {
  params: Promise<{ orgSlug: string; id: string }>
}

const AutomationDetailPage = async ({ params }: AutomationDetailPageProps) => {
  const { orgSlug, id } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: Apenas ADMIN e OWNER podem acessar automações
  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [automation, pipelines, members, lossReasons] = await Promise.all([
    getAutomationById(id, ctx),
    getOrgPipelines(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getDealLostReasons(ctx.orgId),
  ])

  if (!automation) {
    redirect(`/org/${orgSlug}/settings/automations`)
  }

  const stageOptions = await getPipelineStages(
    pipelines.map((pipeline) => pipeline.id),
    ctx.orgId,
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/automations`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Automações
          </Link>
        </Button>
      </div>

      <AutomationDetailClient
        automation={automation}
        orgSlug={orgSlug}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members.accepted}
        lossReasons={lossReasons}
      />
    </div>
  )
}

export default AutomationDetailPage
