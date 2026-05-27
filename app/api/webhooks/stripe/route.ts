import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  getSubscriptionPeriodEnd,
  getSubscriptionPeriodStart,
  mapStripeStatus,
  resolveProductKey,
} from '@/_lib/stripe-utils'
import { resetCreditsForPeriod } from '@/_lib/billing/credit-utils'
import { notifyOrgAdmins } from '@/_lib/notifications/notify-org-admins'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        )
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        )
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        )
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        )
        break

      default:
        // Stripe best practice: retornar 200 para eventos desconhecidos
        break
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    console.error('checkout.session.completed: missing organizationId in metadata')
    return
  }

  // Salvar stripeCustomerId na org se ainda não existe
  if (session.customer) {
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer.id

    await db.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId },
    })
  }

  // Buscar detalhes completos da subscription
  if (!session.subscription) return

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return

  const productKey = await resolveProductKey(subscription)
  const plan = await db.plan.findUnique({ where: { slug: productKey } })

  await db.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      organizationId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: getSubscriptionPeriodStart(subscription),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: { product_key: productKey },
      planId: plan?.id ?? null,
    },
    update: {
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: getSubscriptionPeriodStart(subscription),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: { product_key: productKey },
      planId: plan?.id ?? null,
    },
  })

  revalidateTag(`subscriptions:${organizationId}`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails?.subscription) return

  const subscriptionId =
    typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { organizationId: true },
  })

  if (!existing) return

  const priceId = subscription.items.data[0]?.price.id
  const productKey = await resolveProductKey(subscription)
  const plan = await db.plan.findUnique({ where: { slug: productKey } })

  const periodStart = getSubscriptionPeriodStart(subscription)

  await db.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      stripePriceId: priceId || undefined,
      metadata: { product_key: productKey },
      planId: plan?.id ?? null,
    },
  })

  // Renovação paga: reseta a franquia para o novo período de faturamento
  await resetCreditsForPeriod(existing.organizationId, periodStart)

  revalidateTag(`subscriptions:${existing.organizationId}`)
  revalidateTag(`credits:${existing.organizationId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { organizationId: true },
  })

  if (!existing) return

  const priceId = subscription.items.data[0]?.price.id
  const productKey = await resolveProductKey(subscription)
  const plan = await db.plan.findUnique({ where: { slug: productKey } })

  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      stripePriceId: priceId || undefined,
      status: mapStripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: getSubscriptionPeriodStart(subscription),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      metadata: { product_key: productKey },
      planId: plan?.id ?? null,
    },
  })

  revalidateTag(`subscriptions:${existing.organizationId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { organizationId: true },
  })

  if (!existing) return

  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'canceled' },
  })

  revalidateTag(`subscriptions:${existing.organizationId}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails?.subscription) return

  const subscriptionId =
    typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id

  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { organizationId: true, status: true },
  })

  if (!existing) return

  // Bloqueia e notifica apenas na primeira falha — retries do Stripe não renotificam
  if (existing.status === 'past_due' || existing.status === 'canceled') return

  await db.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: 'past_due' },
  })

  revalidateTag(`subscriptions:${existing.organizationId}`)
  revalidateTag(`modules:${existing.organizationId}`)

  await notifyOrgAdmins({
    orgId: existing.organizationId,
    type: 'SYSTEM',
    title: 'Falha no pagamento',
    body: 'Houve um problema com o pagamento da sua assinatura. Verifique seu método de pagamento.',
    actionPath: '/settings/billing',
    resourceType: 'subscription',
    resourceId: subscriptionId,
  })
}

