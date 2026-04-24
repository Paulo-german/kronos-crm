import type { CostItem } from '@/_data-access/business-report/types'

export interface PlanBaseline {
  id: string
  name: string
  price: number
  credits: number
  activeCount: number
}

export interface BusinessParameters {
  costItems: CostItem[]
  aiMonthlyCostBrl: number
  targetMarginPct: number
}

export interface BusinessMetrics {
  plans: Array<PlanBaseline & { revenueBRL: number; aiCostBRL: number }>
  totalRevenue: number
  totalAiCost: number
  totalFixed: number
  totalCost: number
  marginBRL: number
  marginPct: number
  totalCustomers: number
  targetMargin: number
  extraCustomersNeeded: number | null // null = impossível com config atual
  priceAdjustmentPct: number | null
  suggestedPrices: Record<string, number>
}

const MAX_MARGIN_PCT = 99

export function computeBusinessMetrics(
  baseline: PlanBaseline[],
  params: BusinessParameters,
): BusinessMetrics {
  const totalFixed = params.costItems.reduce((sum, item) => sum + item.amount, 0)
  const aiMonthlyCostBrl = params.aiMonthlyCostBrl
  const targetMargin = Math.min(params.targetMarginPct, MAX_MARGIN_PCT)

  // Distribui o custo total de IA proporcionalmente ao volume de créditos de cada plano
  const totalPlatformCredits = baseline.reduce(
    (sum, plan) => sum + plan.activeCount * plan.credits,
    0,
  )

  const plans = baseline.map((plan) => {
    const planCredits = plan.activeCount * plan.credits
    const aiShare = totalPlatformCredits > 0 ? planCredits / totalPlatformCredits : 0
    return {
      ...plan,
      revenueBRL: plan.activeCount * plan.price,
      aiCostBRL: aiMonthlyCostBrl * aiShare,
    }
  })

  const totalRevenue = plans.reduce((sum, plan) => sum + plan.revenueBRL, 0)
  const totalAiCost = aiMonthlyCostBrl
  const totalCustomers = baseline.reduce((sum, plan) => sum + plan.activeCount, 0)
  const totalCost = totalFixed + totalAiCost
  const marginBRL = totalRevenue - totalCost
  const marginPct = totalRevenue > 0 ? (marginBRL / totalRevenue) * 100 : 0

  // Break-even: clientes adicionais no mix atual para atingir margem alvo
  let extraCustomersNeeded: number | null = null
  if (totalCustomers > 0 && targetMargin > 0) {
    const avgRevenue = totalRevenue / totalCustomers
    const avgAiCost = totalAiCost / totalCustomers
    const contribPerCustomer = avgRevenue * (1 - targetMargin / 100) - avgAiCost
    if (contribPerCustomer > 0) {
      const gap = totalFixed - (totalRevenue * (1 - targetMargin / 100) - totalAiCost)
      extraCustomersNeeded = gap > 0 ? Math.ceil(gap / contribPerCustomer) : 0
    }
    // null = impossível: cada novo cliente piora a margem no alvo
  }

  // Precificação reversa: ajuste % uniforme nos preços para atingir margem alvo
  let priceAdjustmentPct: number | null = null
  const suggestedPrices: Record<string, number> = {}
  if (totalRevenue > 0 && targetMargin > 0) {
    const uniformMultiplier =
      (totalFixed + totalAiCost) / (totalRevenue * (1 - targetMargin / 100))
    priceAdjustmentPct = (uniformMultiplier - 1) * 100
    for (const plan of baseline) {
      suggestedPrices[plan.id] = Math.ceil(plan.price * uniformMultiplier)
    }
  }

  return {
    plans,
    totalRevenue,
    totalAiCost,
    totalFixed,
    totalCost,
    marginBRL,
    marginPct,
    totalCustomers,
    targetMargin,
    extraCustomersNeeded,
    priceAdjustmentPct,
    suggestedPrices,
  }
}
