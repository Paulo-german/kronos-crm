import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgents } from '@/_data-access/agent/get-agents'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { AgentsCardGrid } from './_components/agents-card-grid'

interface AiAgentPageProps {
  params: Promise<{ orgSlug: string }>
}

const AiAgentPage = async ({ params }: AiAgentPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [agents, quota] = await Promise.all([
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'agent'),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Agentes IA</HeaderTitle>
          <HeaderSubTitle>
            Gerencie seus agentes de inteligência artificial.
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="agent" />
        </HeaderLeft>
      </Header>

      <AgentsCardGrid
        agents={agents}
        orgSlug={orgSlug}
        userRole={ctx.userRole}
        withinQuota={quota.withinQuota}
      />
    </div>
  )
}

export default AiAgentPage
