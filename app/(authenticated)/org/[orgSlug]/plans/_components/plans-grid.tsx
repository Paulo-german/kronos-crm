import type { PlanType } from '@/_lib/rbac/plan-limits'
import { PlanCard } from './plan-card'
import { PLANS } from './plans-data'

interface PlansGridProps {
  currentPlan: PlanType | null
  orgSlug: string
  isOnTrial?: boolean
}

export function PlansGrid({ currentPlan, orgSlug, isOnTrial }: PlansGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlan}
          orgSlug={orgSlug}
          isOnTrial={isOnTrial}
        />
      ))}
    </div>
  )
}
