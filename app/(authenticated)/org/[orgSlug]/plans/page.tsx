import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { PlansPageClient } from './_components/plans-page-client'

interface PlansPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function PlansPage({ params }: PlansPageProps) {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const [{ plan: currentPlan }, trialStatus] = await Promise.all([
    getPlanLimits(orgId),
    getTrialStatus(orgId),
  ])

  return (
    <PlansPageClient
      currentPlan={currentPlan}
      orgSlug={orgSlug}
      isOnTrial={trialStatus.isOnTrial}
      daysRemaining={trialStatus.daysRemaining}
      neverHadTrial={trialStatus.neverHadTrial}
      isExpired={trialStatus.isExpired}
      hasActiveSubscription={trialStatus.hasActiveSubscription}
    />
  )
}
