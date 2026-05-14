import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentGroups } from '@/_data-access/agent-group/get-agent-groups'
import { getAgents } from '@/_data-access/agent/get-agents'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { GroupsCardList } from './_components/groups-card-list'

interface GroupsPageProps {
  params: Promise<{ orgSlug: string }>
}

const GroupsPage = async ({ params }: GroupsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [groups, agents, quota] = await Promise.all([
    getAgentGroups(ctx.orgId),
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'agent_group'),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>
            Equipes de Agentes
          </HeaderTitle>
          <HeaderSubTitle>
            Organize agentes em equipes com roteamento inteligente de conversas.
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="agent_group" />
        </HeaderLeft>
      </Header>

      <GroupsCardList
        groups={groups}
        orgSlug={orgSlug}
        agents={agents}
        withinQuota={quota.withinQuota}
      />
    </div>
  )
}

export default GroupsPage
