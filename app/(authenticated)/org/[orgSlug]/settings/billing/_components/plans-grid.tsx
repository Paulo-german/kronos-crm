import type { OrganizationPlan } from '@prisma/client'
import { PlanCard } from './plan-card'
import { PLANS } from './plans-data'

interface PlansGridProps {
  currentPlan: OrganizationPlan
}

export function PlansGrid({ currentPlan }: PlansGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
      ))}
    </div>
  )
}
