import { getStagnantOpportunities } from '@/_data-access/dashboard-v2/get-stagnant-opportunities'
import { getAtRiskCustomers } from '@/_data-access/dashboard-v2/get-at-risk-customers'
import { getWaitingLeads } from '@/_data-access/dashboard-v2/get-waiting-leads'
import type { RBACContext } from '@/_lib/rbac'
import { AttentionStagnantOpportunitiesCard } from './attention-stagnant-opportunities-card'
import { AttentionAtRiskCustomersCard } from './attention-at-risk-customers-card'
import { AttentionWaitingLeadsCard } from './attention-waiting-leads-card'

interface AttentionSectionProps {
  ctx: RBACContext
  orgSlug: string
}

export async function AttentionSection({ ctx, orgSlug }: AttentionSectionProps) {
  const [stagnant, atRisk, waiting] = await Promise.all([
    getStagnantOpportunities(ctx),
    getAtRiskCustomers(ctx),
    getWaitingLeads(ctx),
  ])

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold">Atenção Necessária</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AttentionStagnantOpportunitiesCard data={stagnant} orgSlug={orgSlug} />
        <AttentionAtRiskCustomersCard data={atRisk} orgSlug={orgSlug} />
        <AttentionWaitingLeadsCard data={waiting} orgSlug={orgSlug} />
      </div>
    </section>
  )
}
