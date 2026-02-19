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
