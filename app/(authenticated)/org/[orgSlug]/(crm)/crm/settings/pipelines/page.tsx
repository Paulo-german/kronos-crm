import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { checkPlanQuota, getPlanLimits } from '@/_lib/rbac/plan-limits'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { BackButton } from '@/_components/layout/back-button'
import { PipelinesSettingsClient } from '@/(authenticated)/org/[orgSlug]/(main)/settings/pipelines/_components/pipelines-settings-client'
import { CreatePipelineButton } from '@/(authenticated)/org/[orgSlug]/(main)/settings/pipelines/_components/create-pipeline-button'

interface PipelinesPageProps {
  params: Promise<{ orgSlug: string }>
}

const PipelinesPage = async ({ params }: PipelinesPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [pipelines, quota, planInfo] = await Promise.all([
    getOrgPipelines(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'pipeline'),
    getPlanLimits(ctx.orgId),
  ])

  return (
    <div className="space-y-6">
      <BackButton href={`/org/${orgSlug}/crm/settings`} />
      <Header>
        <HeaderLeft>
          <HeaderTitle>Funis de Vendas</HeaderTitle>
          <HeaderSubTitle>
            Gerencie os funis e etapas de vendas da sua organização.
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="pipeline" />
        </HeaderLeft>
        <HeaderRight>
          <CreatePipelineButton
            orgSlug={orgSlug}
            withinQuota={quota.withinQuota}
            planType={planInfo.plan}
          />
        </HeaderRight>
      </Header>
      <PipelinesSettingsClient
        pipelines={pipelines}
        orgSlug={orgSlug}
      />
    </div>
  )
}

export default PipelinesPage
