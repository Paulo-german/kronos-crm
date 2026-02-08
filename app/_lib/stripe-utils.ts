import type Stripe from 'stripe'

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

/**
 * Resolve product_key com cadeia de fallbacks:
 * 1. metadata da subscription (gravado no checkout)
 * 2. comparação por Price ID via env vars (legado)
 */
export function resolveProductKeyFromPriceId(priceId: string): string {
  const PRICE_TO_PRODUCT_KEY: Record<string, string> = {
    ...(process.env.STRIPE_PRO_PRICE_ID && {
      [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
    }),
    ...(process.env.STRIPE_ENTERPRISE_PRICE_ID && {
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise',
    }),
    ...(process.env.STRIPE_PRO_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_PRO_ANNUAL_PRICE_ID]: 'pro',
    }),
    ...(process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID && {
      [process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID]: 'enterprise',
    }),
  }

  return PRICE_TO_PRODUCT_KEY[priceId] || 'pro'
}
