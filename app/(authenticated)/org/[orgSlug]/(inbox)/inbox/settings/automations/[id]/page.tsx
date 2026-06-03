import { redirect } from 'next/navigation'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAutomationById } from '@/_data-access/automation/get-automation-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getPipelineStages } from '@/_data-access/pipeline/get-pipeline-stages'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { getWhatsappInboxesForAutomation } from '@/_data-access/inbox/get-whatsapp-inboxes-for-automation'

import { AutomationDetailClient } from '@/(authenticated)/org/[orgSlug]/(main)/settings/automations/[id]/_components/automation-detail-client'

interface AutomationDetailPageProps {
  params: Promise<{ orgSlug: string; id: string }>
}

const AutomationDetailPage = async ({ params }: AutomationDetailPageProps) => {
  const { orgSlug, id } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: Apenas ADMIN e OWNER podem acessar automações
  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/inbox/home`)
  }

  const [automation, pipelines, members, lossReasons, whatsappInboxes] = await Promise.all([
    getAutomationById(id, ctx),
    getOrgPipelines(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getDealLostReasons(ctx.orgId),
    getWhatsappInboxesForAutomation(ctx.orgId),
  ])

  if (!automation) {
    redirect(`/org/${orgSlug}/inbox/settings/automations`)
  }

  const stageOptions = await getPipelineStages(
    pipelines.map((pipeline) => pipeline.id),
    ctx.orgId,
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <AutomationDetailClient
        automation={automation}
        orgSlug={orgSlug}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members.accepted}
        lossReasons={lossReasons}
        whatsappInboxes={whatsappInboxes}
      />
    </div>
  )
}

export default AutomationDetailPage
