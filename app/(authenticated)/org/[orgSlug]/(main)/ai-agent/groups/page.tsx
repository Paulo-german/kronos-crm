import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Badge } from '@/_components/ui/badge'
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
            <Badge
              variant="outline"
              className="ml-2 h-5 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            >
              Beta
            </Badge>
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
