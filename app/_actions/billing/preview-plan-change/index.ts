'use server'

import { freeOrgActionClient } from '@/_lib/safe-action'
import { previewPlanChangeSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getActiveSubscription } from '@/_data-access/billing/get-active-subscription'
import { classifyPlanChange } from '@/_lib/billing/plan-tiers'
import { resolveProductKeyFromPriceId } from '@/_lib/stripe-utils'

/** Capitaliza a primeira letra de um slug (ex: "scale" → "Scale") */
function capitalizeSlug(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export interface PlanChangePreviewDto {
  changeType: 'upgrade' | 'downgrade' | 'crossgrade'
  /** Valor proporcional cobrado imediatamente (apenas proration), em centavos */
  immediateCharge: number
  /** Valor da próxima renovação no novo plano, em centavos */
  nextRenewalAmount: number
  currency: string
  /** ISO string — serializado assim ao cruzar a fronteira Server Action → Client */
  nextBillingDate: string
  currentPlanName: string
  targetPlanName: string
}

export const previewPlanChange = freeOrgActionClient
  .schema(previewPlanChangeSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'update'))

    // 1. Buscar subscription ativa — obrigatória para preview de troca
    const subscription = await getActiveSubscription(ctx.orgId)
    if (!subscription) {
      throw new Error(
        'Nenhuma assinatura ativa encontrada para esta organização.',
      )
    }

    // 2. Buscar stripeCustomerId da organização
    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    })

    if (!org.stripeCustomerId) {
      throw new Error('Customer Stripe não encontrado para esta organização.')
    }

    const stripeCustomerId = org.stripeCustomerId
    const stripeSubId = subscription.stripeSubscriptionId

    // 3. Recuperar a subscription completa no Stripe para obter o item ID
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
    const subscriptionItem = stripeSub.items.data[0]

    if (!subscriptionItem) {
      throw new Error('Item da assinatura não encontrado no Stripe.')
    }

    // 4. Classificar o tipo de mudança para definir o comportamento de prorateamento
    const changeType = classifyPlanChange(
      subscription.stripePriceId,
      data.targetPriceId,
    )

    // Downgrades não geram cobrança imediata — aplicam no próximo ciclo
    const prorationBehavior =
      changeType === 'downgrade' ? 'none' : 'create_prorations'

    // 5. Gerar preview da fatura sem efetivamente cobrar
    const previewInvoice = await stripe.invoices.createPreview({
      customer: stripeCustomerId,
      subscription: stripeSubId,
      subscription_details: {
        items: [
          {
            id: subscriptionItem.id,
            price: data.targetPriceId,
          },
        ],
        proration_behavior: prorationBehavior,
      },
    })

    // Separar line items de proration (cobrança imediata) das de renovação (próximo ciclo)
    // Lines com proration=true são ajustes proporcionais; as demais são renovação futura
    let prorationTotal = 0
    let renewalTotal = 0

    for (const line of previewInvoice.lines.data) {
      const amount = line.amount ?? 0
      const isProration =
        (line.parent?.type === 'invoice_item_details' &&
          line.parent.invoice_item_details?.proration) ||
        (line.parent?.type === 'subscription_item_details' &&
          line.parent.subscription_item_details?.proration)

      if (isProration) {
        prorationTotal += amount
      } else {
        renewalTotal += amount
      }
    }

    // Proration líquida (crédito do plano antigo + cobrança do novo proporcional)
    const immediateCharge = Math.max(0, prorationTotal)

    const currentPlanSlug = resolveProductKeyFromPriceId(subscription.stripePriceId)
    const targetPlanSlug = resolveProductKeyFromPriceId(data.targetPriceId)

    const result: PlanChangePreviewDto = {
      changeType,
      immediateCharge,
      nextRenewalAmount: Math.max(0, renewalTotal),
      currency: previewInvoice.currency,
      nextBillingDate: new Date(
        (previewInvoice.next_payment_attempt ?? previewInvoice.period_end) * 1000,
      ).toISOString(),
      currentPlanName: capitalizeSlug(currentPlanSlug),
      targetPlanName: capitalizeSlug(targetPlanSlug),
    }

    return result
  })
