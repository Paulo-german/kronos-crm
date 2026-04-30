'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { stripe } from '@/_lib/stripe'
import {
  getSubscriptionPeriodEnd,
  mapStripeStatus,
  resolveProductKey,
} from '@/_lib/stripe-utils'
import { syncStripeSubscriptionSchema } from './schema'

export const syncStripeSubscription = superAdminActionClient
  .schema(syncStripeSubscriptionSchema)
  .action(async ({ parsedInput: { organizationId, stripeSubscriptionId, stripeCustomerId: inputCustomerId } }) => {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, stripeCustomerId: true },
    })
    if (!org) throw new Error('Organização não encontrada.')

    const subscription = await stripe.subscriptions
      .retrieve(stripeSubscriptionId)
      .catch(() => null)
    if (!subscription) {
      throw new Error('Subscription não encontrada no Stripe.')
    }

    // Se o admin informou o Customer ID manualmente, usa esse; caso contrário resolve pela subscription
    const stripeCustomerId =
      inputCustomerId ??
      (typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id)

    // Impede que uma sub do Stripe já vinculada a outra org seja "roubada" para esta
    const existingSub = await db.subscription.findUnique({
      where: { stripeSubscriptionId },
      select: { organizationId: true },
    })
    if (existingSub && existingSub.organizationId !== organizationId) {
      throw new Error(
        'Esta subscription já está vinculada a outra organização.',
      )
    }

    // Impede conflito de stripeCustomerId: a org já aponta para outro cliente Stripe
    if (org.stripeCustomerId && org.stripeCustomerId !== stripeCustomerId) {
      throw new Error(
        'Organização já possui outro stripeCustomerId vinculado. Limpe manualmente antes de ressincronizar.',
      )
    }

    // Impede conflito inverso: o customerId do Stripe já pertence a outra org no banco
    const orgWithCustomer = await db.organization.findUnique({
      where: { stripeCustomerId },
      select: { id: true },
    })
    if (orgWithCustomer && orgWithCustomer.id !== organizationId) {
      throw new Error(
        'Este stripeCustomerId já está vinculado a outra organização.',
      )
    }

    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) throw new Error('Subscription sem priceId no Stripe.')

    const productKey = await resolveProductKey(subscription)
    const plan = await db.plan.findUnique({ where: { slug: productKey } })
    const status = mapStripeStatus(subscription.status)
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription)

    await db.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId },
    })

    await db.subscription.upsert({
      where: { stripeSubscriptionId },
      create: {
        organizationId,
        stripeSubscriptionId,
        stripePriceId: priceId,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: { product_key: productKey },
        planId: plan?.id ?? null,
      },
      update: {
        stripePriceId: priceId,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: { product_key: productKey },
        planId: plan?.id ?? null,
      },
    })

    revalidateTag(`subscriptions:${organizationId}`)

    return {
      success: true,
      planSlug: productKey,
      status,
    }
  })
