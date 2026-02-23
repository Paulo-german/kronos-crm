import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDeals } from '@/_data-access/deal/get-deals'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getOrgPipeline } from '@/_data-access/pipeline/get-user-pipeline'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'
import { DealsDataTable } from './_components/deals-data-table'
import CreateDealButton from '../_components/create-deal-button'
import { ViewToggle } from '../_components/view-toggle'
import { PipelineSettingsButton } from '../_components/pipeline-settings-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

interface DealsListPageProps {
  params: Promise<{ orgSlug: string }>
}

const DealsListPage = async ({ params }: DealsListPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const pipelineRaw = await getOrgPipeline(ctx.orgId)
  const pipeline =
    pipelineRaw || (await createDefaultPipeline({ orgId: ctx.orgId }))

  const [deals, contacts, members, quota] = await Promise.all([
    getDeals(ctx),
    getContacts(ctx),
    getOrganizationMembers(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'deal'),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <div className="flex items-center gap-4">
            <HeaderTitle>Negociações</HeaderTitle>
          </div>
          <HeaderSubTitle>
            Visualize e gerencie todas as suas negociações
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="deal" />
        </HeaderLeft>
        <HeaderRight>
          <ViewToggle activeView="list" />
          {(ctx.userRole === 'ADMIN' || ctx.userRole === 'OWNER') && (
            <PipelineSettingsButton pipeline={pipeline} />
          )}
          <CreateDealButton
            stages={pipeline.stages}
            contacts={contacts}
            withinQuota={quota.withinQuota}
          />
        </HeaderRight>
      </Header>
      <DealsDataTable
        deals={deals}
        stages={pipeline.stages}
        contacts={contacts}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
      />
    </div>
  )
}

export default DealsListPage
