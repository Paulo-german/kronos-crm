'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { stripe } from '@/_lib/stripe'
import { getSubscriptionPeriodStart } from '@/_lib/stripe-utils'
import { resetCreditsForPeriod } from '@/_lib/billing/credit-utils'
import { adminResetOrgCreditsSchema } from './schema'

export const adminResetOrgCredits = superAdminActionClient
  .schema(adminResetOrgCreditsSchema)
  .action(async ({ parsedInput: { organizationId } }) => {
    const subscription = await db.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['active', 'trialing'] },
      },
      select: { id: true, stripeSubscriptionId: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada para esta organização.')
    }

    const stripeSubscription = await stripe.subscriptions
      .retrieve(subscription.stripeSubscriptionId)
      .catch(() => null)

    if (!stripeSubscription) {
      throw new Error('Subscription não encontrada no Stripe.')
    }

    const periodStart = getSubscriptionPeriodStart(stripeSubscription)

    await db.subscription.update({
      where: { id: subscription.id },
      data: { currentPeriodStart: periodStart },
    })

    // force=true: admin explicitamente solicitou o reset, ignora guarda de idempotência
    await resetCreditsForPeriod(organizationId, periodStart, undefined, true)

    revalidateTag(`subscriptions:${organizationId}`)
    revalidateTag(`credits:${organizationId}`)

    return { success: true, periodStart }
  })
