import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getAgents } from '@/_data-access/agent/get-agents'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { InboxesCardGrid } from '@/(authenticated)/org/[orgSlug]/(main)/settings/inboxes/_components/inboxes-card-grid'
import DiscoverInstancesButton from '@/(authenticated)/org/[orgSlug]/(main)/settings/inboxes/_components/discover-instances-button'
import CreateInboxButton from '@/(authenticated)/org/[orgSlug]/(main)/settings/inboxes/_components/create-inbox-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { BackButton } from '@/_components/layout/back-button'
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

  const [inboxes, agents, quota, user] = await Promise.all([
    getInboxes(ctx.orgId),
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'inbox'),
    getUserById(ctx.userId),
  ])

  const isSuperAdmin = user?.isSuperAdmin ?? false

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }))

  return (
    <div className="space-y-6">
      <BackButton href={`/org/${orgSlug}/inbox/settings`} />
      <Header>
        <HeaderLeft>
          <HeaderTitle>Caixas de Entrada</HeaderTitle>
          <HeaderSubTitle>
            Gerencie suas conexões WhatsApp e canais de atendimento
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="inbox" />
        </HeaderLeft>
        <HeaderRight>
          <DiscoverInstancesButton />
          <CreateInboxButton
            agentOptions={agentOptions}
            withinQuota={quota.withinQuota}
            isSuperAdmin={isSuperAdmin}
          />
        </HeaderRight>
      </Header>
      <InboxesCardGrid
        inboxes={inboxes}
        agentOptions={agentOptions}
        orgSlug={orgSlug}
        withinQuota={quota.withinQuota}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}

export default InboxesPage
