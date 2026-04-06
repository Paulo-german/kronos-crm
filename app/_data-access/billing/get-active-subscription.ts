import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ActiveSubscriptionDto {
  id: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  planSlug: string | null
}

export const getActiveSubscription = cache(
  async (orgId: string): Promise<ActiveSubscriptionDto | null> => {
    const getCached = unstable_cache(
      async () => {
        const subscription = await db.subscription.findFirst({
          where: {
            organizationId: orgId,
            status: { in: ['active', 'trialing'] },
          },
          include: { plan: { select: { slug: true } } },
          orderBy: { createdAt: 'desc' },
        })

        if (!subscription) return null

        return {
          id: subscription.id,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripePriceId: subscription.stripePriceId,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          planSlug: subscription.plan?.slug ?? null,
        }
      },
      [`active-subscription-${orgId}`],
      { tags: [`subscriptions:${orgId}`], revalidate: 3600 },
    )

    return getCached()
  },
)
