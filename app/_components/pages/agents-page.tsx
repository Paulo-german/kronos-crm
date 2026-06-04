import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgents } from '@/_data-access/agent/get-agents'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { AgentsCardGrid } from '@/(authenticated)/org/[orgSlug]/(agents)/agents/ai-agent/_components/agents-card-grid'
import { AgentsListIntroTrigger } from '@/_components/tutorials/agents-list-intro-trigger'

interface AgentsPageProps {
  params: Promise<{ orgSlug: string }>
}

const AgentsPage = async ({ params }: AgentsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const singleV2OverhaulEnabled = process.env.SINGLE_V2_OVERHAUL_ENABLED === 'true'

  const [agents, quota, user, completedTutorialIds] = await Promise.all([
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'agent'),
    getUserById(ctx.userId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  const isSuperAdmin = user?.isSuperAdmin ?? false
  const isSupportAgent = ctx.isSupportAgent

  return (
    <div className="space-y-6">
      <AgentsListIntroTrigger
        hasSeenAgentsListIntro={completedTutorialIds.includes('agents-list')}
      />
      <Header>
        <HeaderLeft>
          <HeaderTitle>Agentes IA</HeaderTitle>
          <HeaderSubTitle>Gerencie seus agentes de inteligência artificial.</HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="agent" />
        </HeaderLeft>
      </Header>

      <AgentsCardGrid
        agents={agents}
        orgSlug={orgSlug}
        userRole={ctx.userRole}
        withinQuota={quota.withinQuota}
        allAgents={agents}
        singleV2OverhaulEnabled={singleV2OverhaulEnabled}
        isSuperAdmin={isSuperAdmin}
        isSupportAgent={isSupportAgent}
      />
    </div>
  )
}

export default AgentsPage
