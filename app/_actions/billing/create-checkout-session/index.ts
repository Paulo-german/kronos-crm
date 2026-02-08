'use server'

import { cookies, headers } from 'next/headers'
import { orgActionClient, ORG_SLUG_COOKIE } from '@/_lib/safe-action'
import { createCheckoutSessionSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createCheckoutSession = orgActionClient
  .schema(createCheckoutSessionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão: apenas OWNER/ADMIN podem criar checkout
    requirePermission(canPerformAction(ctx, 'billing', 'create'))

    // 2. Buscar orgSlug para construir return_url
    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      throw new Error('Organização não encontrada.')
    }

    // 3. Obter origin da requisição
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // 4. Buscar ou criar Stripe Customer
    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true, name: true },
    })

    let stripeCustomerId = org.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId: ctx.orgId },
      })

      await db.organization.update({
        where: { id: ctx.orgId },
        data: { stripeCustomerId: customer.id },
      })

      stripeCustomerId = customer.id
    }

    // 5. Derivar product_key pelo priceId
    const PRICE_TO_PRODUCT_KEY: Record<string, string> = {
      ...(process.env.STRIPE_PRO_PRICE_ID && {
        [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
      }),
      ...(process.env.STRIPE_ENTERPRISE_PRICE_ID && {
        [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise',
      }),
    }

    const productKey = PRICE_TO_PRODUCT_KEY[data.priceId] || 'pro'

    // 6. Criar Checkout Session (embedded mode)
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: data.priceId, quantity: 1 }],
      mode: 'subscription',
      ui_mode: 'embedded',
      return_url: `${origin}/org/${orgSlug}/settings/billing?success=true`,
      metadata: {
        organizationId: ctx.orgId,
      },
      subscription_data: {
        metadata: {
          organizationId: ctx.orgId,
          product_key: productKey,
        },
      },
    })

    return { clientSecret: session.client_secret }
  })
