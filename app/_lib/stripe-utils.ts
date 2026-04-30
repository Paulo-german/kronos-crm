import type Stripe from 'stripe'
import { stripe } from '@/_lib/stripe'

/**
 * Extrai current_period_end do primeiro item da subscription.
 * Na API Stripe clover, current_period_end está nos items, não na subscription root.
 */
export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): Date {
  const periodEnd = subscription.items.data[0]?.current_period_end
  if (!periodEnd) {
    return new Date()
  }
  return new Date(periodEnd * 1000)
}

const STRIPE_STATUS_MAP: Record<
  string,
  'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'
> = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  trialing: 'trialing',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  unpaid: 'past_due',
  paused: 'canceled',
}

/**
 * Mapeia status do Stripe para o enum SubscriptionStatus do Prisma.
 * Centralizado aqui para evitar drift entre o webhook e a action de sync admin.
 */
export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' {
  return STRIPE_STATUS_MAP[status] ?? 'active'
}

/**
 * Resolve product_key com cadeia de fallbacks:
 * 1. metadata da subscription (gravado no checkout)
 * 2. metadata do Product no Stripe (configurado no dashboard)
 * 3. comparação por Price ID via env vars (legado)
 *
 * Extraído do webhook para ser compartilhado com a action de sync admin —
 * evita duplicação da cadeia de fallbacks e risco de drift entre os dois contextos.
 */
export async function resolveProductKey(
  subscription: Stripe.Subscription,
): Promise<string> {
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

  const priceId = subscription.items.data[0]?.price.id ?? ''
  return resolveProductKeyFromPriceId(priceId)
}

/**
 * Resolve product_key (slug do plano no DB) a partir do Price ID do Stripe.
 * Fallback: 'light' se o priceId não for reconhecido.
 */
export function resolveProductKeyFromPriceId(priceId: string): string {
  const PRICE_TO_PRODUCT_KEY: Record<string, string> = {
    // Light
    ...(process.env.STRIPE_LIGHT_PRICE_ID && {
      [process.env.STRIPE_LIGHT_PRICE_ID]: 'light',
    }),
    ...(process.env.STRIPE_LIGHT_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_LIGHT_ANNUAL_PRICE_ID]: 'light',
    }),
    // Essential
    ...(process.env.STRIPE_ESSENTIAL_PRICE_ID && {
      [process.env.STRIPE_ESSENTIAL_PRICE_ID]: 'essential',
    }),
    ...(process.env.STRIPE_ESSENTIAL_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_ESSENTIAL_ANNUAL_PRICE_ID]: 'essential',
    }),
    // Scale (antigo "pro")
    ...(process.env.STRIPE_SCALE_PRICE_ID && {
      [process.env.STRIPE_SCALE_PRICE_ID]: 'scale',
    }),
    ...(process.env.STRIPE_SCALE_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_SCALE_ANNUAL_PRICE_ID]: 'scale',
    }),
    // Retrocompatibilidade com env vars legados do plano "pro"
    ...(process.env.STRIPE_PRO_PRICE_ID && {
      [process.env.STRIPE_PRO_PRICE_ID]: 'scale',
    }),
    ...(process.env.STRIPE_PRO_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_PRO_ANNUAL_PRICE_ID]: 'scale',
    }),
    // Enterprise
    ...(process.env.STRIPE_ENTERPRISE_PRICE_ID && {
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise',
    }),
    ...(process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID]: 'enterprise',
    }),
  }

  return PRICE_TO_PRODUCT_KEY[priceId] || 'light'
}
