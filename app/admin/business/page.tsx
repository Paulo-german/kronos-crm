import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { getAdminPlans } from '@/_data-access/admin/get-admin-plans'
import { getBusinessReport } from '@/_data-access/business-report/get-business-report'
import { PLANS } from '@/_lib/billing/plans-data'
import { PLAN_CREDITS } from '@/_lib/billing/plan-credits'
import { BusinessAnalysisClient } from './_components/business-analysis-client'

export default async function BusinessAnalysisPage() {
  const [adminPlans, report] = await Promise.all([
    getAdminPlans(),
    getBusinessReport(),
  ])

  const baseline = PLANS.map((plan) => {
    const adminPlan = adminPlans.find((adminPlanItem) => adminPlanItem.slug === plan.id)
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      credits: PLAN_CREDITS[plan.id] ?? 0,
      activeCount: adminPlan?.activeSubscriptions ?? 0,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Análise de Negócio</HeaderTitle>
          <HeaderSubTitle>
            Parâmetros persistentes + base real de assinaturas — margem
            agregada, break-even e precificação sugerida.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>
      <BusinessAnalysisClient baseline={baseline} report={report} />
    </div>
  )
}
