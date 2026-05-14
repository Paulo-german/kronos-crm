import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAutomations } from '@/_data-access/automation/get-automations'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getPipelineStages } from '@/_data-access/pipeline/get-pipeline-stages'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { getWhatsappInboxesForAutomation } from '@/_data-access/inbox/get-whatsapp-inboxes-for-automation'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'

import { AutomationsDataTable } from './_components/automations-data-table'
import CreateAutomationButton from './_components/create-automation-button'

interface AutomationsPageProps {
  params: Promise<{ orgSlug: string }>
}

const AutomationsPage = async ({ params }: AutomationsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: Apenas ADMIN e OWNER podem acessar automações
  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/settings`)
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

  // Busca estágios de todos os pipelines disponíveis
  const stageOptions = await getPipelineStages(
    pipelines.map((pipeline) => pipeline.id),
    ctx.orgId,
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>
            Automações
          </HeaderTitle>
          <HeaderSubTitle>
            Crie regras para automatizar ações no seu funil.
          </HeaderSubTitle>
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
