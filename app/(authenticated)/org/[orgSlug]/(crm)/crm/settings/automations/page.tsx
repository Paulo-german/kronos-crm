import { redirect } from 'next/navigation'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAutomations } from '@/_data-access/automation/get-automations'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getPipelineStages } from '@/_data-access/pipeline/get-pipeline-stages'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { getWhatsappInboxesForAutomation } from '@/_data-access/inbox/get-whatsapp-inboxes-for-automation'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'

import { AutomationsDataTable } from '@/(authenticated)/org/[orgSlug]/(main)/settings/automations/_components/automations-data-table'
import CreateAutomationButton from '@/(authenticated)/org/[orgSlug]/(main)/settings/automations/_components/create-automation-button'

interface AutomationsPageProps {
  params: Promise<{ orgSlug: string }>
}

const AutomationsPage = async ({ params }: AutomationsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [automations, pipelines, members, quota, lossReasons, whatsappInboxes] =
    await Promise.all([
      getAutomations(ctx),
      getOrgPipelines(ctx.orgId),
      getOrganizationMembers(ctx.orgId),
      checkPlanQuota(ctx.orgId, 'automation'),
      getDealLostReasons(ctx.orgId),
      getWhatsappInboxesForAutomation(ctx.orgId),
    ])

  const stageOptions = await getPipelineStages(
    pipelines.map((pipeline) => pipeline.id),
    ctx.orgId,
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Automações</HeaderTitle>
          <HeaderSubTitle>Crie regras para automatizar ações no seu funil.</HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="automation" />
        </HeaderLeft>
        <HeaderRight>
          <CreateAutomationButton
            withinQuota={quota.withinQuota}
            pipelines={pipelines}
            stageOptions={stageOptions}
            members={members.accepted}
            lossReasons={lossReasons}
            whatsappInboxes={whatsappInboxes}
          />
        </HeaderRight>
      </Header>

      <AutomationsDataTable
        automations={automations}
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

export default AutomationsPage
