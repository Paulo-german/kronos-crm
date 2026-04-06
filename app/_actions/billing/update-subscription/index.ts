'use server'

import Stripe from 'stripe'
import { freeOrgActionClient } from '@/_lib/safe-action'
import { updateSubscriptionSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getActiveSubscription } from '@/_data-access/billing/get-active-subscription'
import { classifyPlanChange } from '@/_lib/billing/plan-tiers'
import { resolveProductKeyFromPriceId } from '@/_lib/stripe-utils'
import { revalidateTag } from 'next/cache'
import type { PlanChangeType } from '@/_lib/billing/plan-tiers'

export const updateSubscription = freeOrgActionClient
  .schema(updateSubscriptionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'update'))

    // 1. Buscar subscription ativa — obrigatória para executar a troca
    const subscription = await getActiveSubscription(ctx.orgId)
    if (!subscription) {
      throw new Error(
        'Nenhuma assinatura ativa encontrada para esta organização.',
      )
    }

    const stripeSubId = subscription.stripeSubscriptionId

    // 2. Recuperar a subscription completa no Stripe para obter o item ID
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
    const subscriptionItem = stripeSub.items.data[0]

    if (!subscriptionItem) {
      throw new Error('Item da assinatura não encontrado no Stripe.')
    }

    // 3. Classificar o tipo de mudança para definir o comportamento adequado
    const changeType: PlanChangeType = classifyPlanChange(
      subscription.stripePriceId,
      data.targetPriceId,
    )

    const productKey = resolveProductKeyFromPriceId(data.targetPriceId)

    // 4. Atualizar a assinatura no Stripe com comportamento de cobrança específico
    // Downgrades aplicam no próximo ciclo sem prorateamento imediato
    // Upgrades e crossgrades cobram a diferença proporcional imediatamente
    try {
      if (changeType === 'downgrade') {
        await stripe.subscriptions.update(stripeSubId, {
          items: [{ id: subscriptionItem.id, price: data.targetPriceId }],
          proration_behavior: 'none',
          metadata: {
            organizationId: ctx.orgId,
            product_key: productKey,
          },
        })
      } else {
        // always_invoice gera fatura imediata com a proration e cobra na hora
        await stripe.subscriptions.update(stripeSubId, {
          items: [{ id: subscriptionItem.id, price: data.targetPriceId }],
          proration_behavior: 'always_invoice',
          payment_behavior: 'error_if_incomplete',
          metadata: {
            organizationId: ctx.orgId,
            product_key: productKey,
          },
        })
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new Error(
          `Cartão recusado: ${error.message}. Tente outro cartão ou atualize seu método de pagamento.`,
        )
      }
      throw error
    }

    // O webhook customer.subscription.updated sincroniza o banco automaticamente,
    // mas invalidamos o cache agora para que a UI reflita a mudança antes do webhook
    revalidateTag(`subscriptions:${ctx.orgId}`)

    return { success: true, changeType }
  })
