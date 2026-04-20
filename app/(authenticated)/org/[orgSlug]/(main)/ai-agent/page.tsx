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

// Forçar renderização dinâmica para que process.env seja lido em runtime,
// evitando que Next.js cache o valor da flag durante o build.
export const dynamic = 'force-dynamic'

interface AiAgentPageProps {
  params: Promise<{ orgSlug: string }>
}

const AiAgentPage = async ({ params }: AiAgentPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const singleV2OverhaulEnabled =
    process.env.SINGLE_V2_OVERHAUL_ENABLED === 'true'

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
        allAgents={agents}
        singleV2OverhaulEnabled={singleV2OverhaulEnabled}
      />
    </div>
  )
}

export default AiAgentPage
