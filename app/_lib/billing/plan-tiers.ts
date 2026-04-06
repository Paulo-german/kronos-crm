import 'server-only'
import { resolveProductKeyFromPriceId } from '@/_lib/stripe-utils'

const PLAN_TIER_ORDER: Record<string, number> = {
  light: 1,
  essential: 2,
  scale: 3,
  enterprise: 4,
}

export type PlanChangeType = 'upgrade' | 'downgrade' | 'crossgrade'

/**
 * Classifica o tipo de mudança entre dois price IDs do Stripe.
 * Crossgrade acontece quando o slug do plano é o mesmo mas o intervalo muda
 * (ex: mensal → anual do mesmo plano).
 */
export function classifyPlanChange(
  currentPriceId: string,
  targetPriceId: string,
): PlanChangeType {
  const currentSlug = resolveProductKeyFromPriceId(currentPriceId)
  const targetSlug = resolveProductKeyFromPriceId(targetPriceId)

  if (currentSlug === targetSlug) return 'crossgrade'

  const currentTier = PLAN_TIER_ORDER[currentSlug] ?? 0
  const targetTier = PLAN_TIER_ORDER[targetSlug] ?? 0

  if (targetTier > currentTier) return 'upgrade'
  return 'downgrade'
}
