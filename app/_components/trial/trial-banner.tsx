import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { TrialBannerClient } from './trial-banner-client'
import type { MemberRole } from '@prisma/client'

interface TrialBannerProps {
  orgId: string
  orgSlug: string
  userRole: MemberRole
}

export const TrialBanner = async ({ orgId, orgSlug, userRole }: TrialBannerProps) => {
  const trialStatus = await getTrialStatus(orgId)

  if (trialStatus.phase === 'none') return null

  return (
    <TrialBannerClient
      phase={trialStatus.phase}
      daysRemaining={trialStatus.daysRemaining}
      trialEndsAt={trialStatus.trialEndsAt ? String(trialStatus.trialEndsAt) : null}
      isExpired={trialStatus.isExpired}
      neverHadTrial={trialStatus.neverHadTrial}
      orgSlug={orgSlug}
      userRole={userRole}
    />
  )
}
