import type { PlanType } from '@/_lib/rbac/plan-limits'
import type { PlanInfo } from '@/_lib/billing/plans-data'
import { PlanCard } from './plan-card'
import { PLANS } from '@/_lib/billing/plans-data'

interface PlansGridProps {
  currentPlan: PlanType | null
  orgSlug: string
  isOnTrial?: boolean
  interval?: 'monthly' | 'yearly'
  hasActiveSubscription?: boolean
  onPlanChange?: (plan: PlanInfo) => void
}

export function PlansGrid({
  currentPlan,
  orgSlug,
  isOnTrial,
  interval,
  hasActiveSubscription,
  onPlanChange,
}: PlansGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlan}
          orgSlug={orgSlug}
          isOnTrial={isOnTrial}
          interval={interval}
          hasActiveSubscription={hasActiveSubscription}
          onPlanChange={onPlanChange}
        />
      ))}
    </div>
  )
}
