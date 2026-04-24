import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminPlans } from '@/_data-access/admin/get-admin-plans'
import { PLANS } from '@/_lib/billing/plans-data'
import { PLAN_CREDITS } from '@/_lib/billing/plan-credits'
import { ViabilitySimulator } from './_components/viability-simulator'

export default async function ViabilityPage() {
  const adminPlans = await getAdminPlans()

  const baseline = PLANS.map((plan) => {
    const adminPlan = adminPlans.find((p) => p.slug === plan.id)
    return {
      id:          plan.id,
      name:        plan.name,
      price:       plan.price,
      credits:     PLAN_CREDITS[plan.id] ?? 0,
      activeCount: adminPlan?.activeSubscriptions ?? 0,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Viabilidade do Negócio</HeaderTitle>
          <HeaderSubTitle>
            Base real de assinaturas + custos fixos → margem agregada, break-even e precificação sugerida.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <ViabilitySimulator baseline={baseline} />
    </div>
  )
}
