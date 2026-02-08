'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createSetupIntentSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

/**
 * Cria um SetupIntent para tokenizar o cartão do cliente ANTES de criar a assinatura.
 * Estratégia: Setup Intent First (recomendado pela Stripe para SaaS).
 *
 * Pré-requisito: Customer já deve existir no Stripe (criado por saveBillingData no step 2).
 *
 * @returns { setupSecret: string, customerId: string }
 */
export const createSetupIntent = orgActionClient
  .schema(createSetupIntentSchema)
  .action(async ({ ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'create'))

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    })

    // Customer deve ter sido criado/atualizado por saveBillingData (step 2)
    if (!org.stripeCustomerId) {
      throw new Error(
        'Dados cadastrais incompletos. Volte ao passo anterior e preencha suas informações antes de continuar.',
      )
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: org.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        organizationId: ctx.orgId,
      },
    })

    return {
      setupSecret: setupIntent.client_secret!,
      customerId: org.stripeCustomerId,
    }
  })
