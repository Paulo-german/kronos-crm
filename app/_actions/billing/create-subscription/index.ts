'use server'

import Stripe from 'stripe'
import { orgActionClient } from '@/_lib/safe-action'
import { createSubscriptionSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveProductKeyFromPriceId } from '@/_lib/stripe-utils'

/**
 * Cria uma assinatura ATIVA com o método de pagamento já validado.
 * Estratégia: Setup Intent First - o cartão já foi tokenizado antes desta chamada.
 *
 * O Stripe anexa automaticamente o PaymentMethod ao Customer quando passado via
 * `default_payment_method` na criação da subscription. Isso evita PaymentMethods
 * órfãos caso a criação da subscription falhe.
 */
export const createSubscription = orgActionClient
  .schema(createSubscriptionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'create'))

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    })

    if (!org.stripeCustomerId) {
      throw new Error(
        'Customer não encontrado. Recarregue a página e tente novamente.',
      )
    }

    const productKey = resolveProductKeyFromPriceId(data.priceId)

    // Busca o Plan no DB pelo slug derivado do priceId (ex: "scale", "enterprise")
    const plan = await db.plan.findUnique({ where: { slug: productKey } })

    // Criar a assinatura com cobrança imediata
    // O Stripe anexa o PM ao Customer automaticamente via default_payment_method
    // Se falhar (cartão recusado), não sobra PM órfão anexado
    let subscription: Stripe.Subscription
    try {
      subscription = await stripe.subscriptions.create({
        customer: org.stripeCustomerId,
        items: [{ price: data.priceId, quantity: 1 }],
        default_payment_method: data.paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId: ctx.orgId,
          product_key: productKey,
        },
        payment_behavior: 'error_if_incomplete',
      })
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new Error(
          `Cartão recusado: ${error.message}. Tente outro cartão.`,
        )
      }
      throw error
    }

    const priceId = subscription.items.data[0]?.price.id || data.priceId
    const periodEnd = subscription.items.data[0]?.current_period_end
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : new Date()

    await db.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        organizationId: ctx.orgId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status as
          | 'active'
          | 'trialing'
          | 'past_due'
          | 'canceled'
          | 'incomplete',
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: { product_key: productKey },
        planId: plan?.id ?? null,
      },
      update: {
        stripePriceId: priceId,
        status: subscription.status as
          | 'active'
          | 'trialing'
          | 'past_due'
          | 'canceled'
          | 'incomplete',
        currentPeriodEnd,
        metadata: { product_key: productKey },
        planId: plan?.id ?? null,
      },
    })

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
    }
  })
