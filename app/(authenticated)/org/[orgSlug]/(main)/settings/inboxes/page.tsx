import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getAgents } from '@/_data-access/agent/get-agents'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { InboxesDataTable } from './_components/inboxes-data-table'
import CreateInboxButton from './_components/create-inbox-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

interface InboxesPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxesPage = async ({ params }: InboxesPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inboxes, agents, quota] = await Promise.all([
    getInboxes(ctx.orgId),
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'inbox'),
  ])

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }))

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Caixas de Entrada</HeaderTitle>
          <HeaderSubTitle>
            Gerencie suas conexões WhatsApp e canais de atendimento
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="inbox" />
        </HeaderLeft>
        <HeaderRight>
          <CreateInboxButton
            agentOptions={agentOptions}
            withinQuota={quota.withinQuota}
          />
        </HeaderRight>
      </Header>
      <InboxesDataTable
        inboxes={inboxes}
        agentOptions={agentOptions}
        orgSlug={orgSlug}
      />
    </div>
  )
}

export default InboxesPage
