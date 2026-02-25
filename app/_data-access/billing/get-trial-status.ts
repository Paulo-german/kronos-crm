import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface TrialStatus {
  isOnTrial: boolean
  hasActiveSubscription: boolean
  trialEndsAt: Date | null
  daysRemaining: number
  isExpired: boolean
  phase: 'info' | 'warning' | 'danger' | 'expired' | 'none'
}

export const getTrialStatus = cache(async (orgId: string): Promise<TrialStatus> => {
  const getCached = unstable_cache(
    async () => {
      const [org, subscription] = await Promise.all([
        db.organization.findUnique({
          where: { id: orgId },
          select: { trialEndsAt: true, planOverrideId: true },
        }),
        db.subscription.findFirst({
          where: { organizationId: orgId, status: { in: ['active', 'trialing'] } },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      const hasActiveSubscription = !!subscription
      const hasGrantOverride = !!org?.planOverrideId
      const trialEndsAt = org?.trialEndsAt ?? null

      if (hasActiveSubscription || hasGrantOverride) {
        return {
          isOnTrial: false,
          hasActiveSubscription: hasActiveSubscription || hasGrantOverride,
          trialEndsAt,
          daysRemaining: 0,
          isExpired: false,
          phase: 'none' as const,
        }
      }

      if (!trialEndsAt) {
        return {
          isOnTrial: false,
          hasActiveSubscription: false,
          trialEndsAt: null,
          daysRemaining: 0,
          isExpired: true,
          phase: 'expired' as const,
        }
      }

      const now = new Date()
      const diffMs = trialEndsAt.getTime() - now.getTime()
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

      if (daysRemaining <= 0) {
        return {
          isOnTrial: false,
          hasActiveSubscription: false,
          trialEndsAt,
          daysRemaining: 0,
          isExpired: true,
          phase: 'expired' as const,
        }
      }

      let phase: TrialStatus['phase'] = 'info'
      if (daysRemaining <= 1) phase = 'danger'
      else if (daysRemaining <= 3) phase = 'warning'

      return {
        isOnTrial: true,
        hasActiveSubscription: false,
        trialEndsAt,
        daysRemaining,
        isExpired: false,
        phase,
      }
    },
    [`trial-status-${orgId}`],
    { tags: [`subscriptions:${orgId}`], revalidate: 300 },
  )

  return getCached()
})
