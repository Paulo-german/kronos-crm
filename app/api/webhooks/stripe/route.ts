import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { getSubscriptionPeriodEnd, resolveProductKeyFromPriceId } from '@/_lib/stripe-utils'
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

  await db.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      organizationId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: { product_key: productKey },
    },
    update: {
      stripePriceId: priceId,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: { product_key: productKey },
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

  await db.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'active',
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    },
  })

  revalidateTag(`subscriptions:${existing.organizationId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { organizationId: true },
  })

  if (!existing) return

  const priceId = subscription.items.data[0]?.price.id
  const productKey = await resolveProductKey(subscription)

  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      stripePriceId: priceId || undefined,
      status: mapStripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
      metadata: { product_key: productKey },
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

/**
 * Mapeia status do Stripe para o enum SubscriptionStatus do Prisma
 */
function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' {
  const statusMap: Record<string, 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
    paused: 'canceled',
  }

  return statusMap[status] || 'active'
}

/**
 * Resolve product_key com cadeia de fallbacks:
 * 1. metadata da subscription (gravado no checkout)
 * 2. metadata do Product no Stripe
 * 3. comparação por Price ID via env vars (legado)
 */
async function resolveProductKey(subscription: Stripe.Subscription): Promise<string> {
  const fromMetadata = subscription.metadata?.product_key
  if (fromMetadata) return fromMetadata

  console.warn(
    `[billing] product_key missing in subscription metadata (${subscription.id}), falling back to Stripe Product`,
  )

  const productId = subscription.items.data[0]?.price.product
  if (productId) {
    const id = typeof productId === 'string' ? productId : productId.id
    try {
      const product = await stripe.products.retrieve(id)
      const fromProduct = product.metadata?.product_key
      if (fromProduct) return fromProduct
    } catch (err) {
      console.error(`[billing] Failed to retrieve Stripe product ${id}:`, err)
    }
  }

  console.warn(
    `[billing] Falling back to env-based price ID mapping for subscription ${subscription.id}`,
  )

  const priceId = subscription.items.data[0]?.price.id || ''
  return resolveProductKeyFromPriceId(priceId)
}
