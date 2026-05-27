import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { stripe } from '@/_lib/stripe'
import {
  mapStripeStatus,
  getSubscriptionPeriodEnd,
  getSubscriptionPeriodStart,
  resolveProductKey,
} from '@/_lib/stripe-utils'

export const maxDuration = 300

const BATCH_SIZE = 50

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()

  // Subscriptions com período vencido que não estão canceladas —
  // são candidatas a terem status desatualizado por falha de webhook
  const candidates = await db.subscription.findMany({
    where: {
      status: { not: 'canceled' },
      currentPeriodEnd: { lt: new Date() },
    },
    select: {
      stripeSubscriptionId: true,
      organizationId: true,
      status: true,
      currentPeriodEnd: true,
    },
  })

  console.log(`[sync-subscriptions-cron] ${candidates.length} candidatas encontradas`)

  let checked = 0
  let updated = 0
  let errors = 0

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(
      batch.map(async (sub) => {
        checked++
        try {
          const stripeSub = await stripe.subscriptions
            .retrieve(sub.stripeSubscriptionId)
            .catch(() => null)

          if (!stripeSub) {
            // Subscription não encontrada no Stripe — marcar como cancelada
            if (sub.status !== 'canceled') {
              await db.subscription.update({
                where: { stripeSubscriptionId: sub.stripeSubscriptionId },
                data: { status: 'canceled' },
              })
              revalidateTag(`subscriptions:${sub.organizationId}`)
              revalidateTag(`modules:${sub.organizationId}`)
              updated++
              console.log(`[sync-subscriptions-cron] ${sub.stripeSubscriptionId} → canceled (não encontrada no Stripe)`)
            }
            return
          }

          const newStatus = mapStripeStatus(stripeSub.status)
          const newPeriodEnd = getSubscriptionPeriodEnd(stripeSub)
          const newPeriodStart = getSubscriptionPeriodStart(stripeSub)

          // Só atualiza se houver divergência de status ou de período
          const periodEndChanged = newPeriodEnd.getTime() !== sub.currentPeriodEnd.getTime()
          if (newStatus === sub.status && !periodEndChanged) return

          const productKey = await resolveProductKey(stripeSub)
          const plan = await db.plan.findUnique({ where: { slug: productKey } })
          const priceId = stripeSub.items.data[0]?.price.id

          await db.subscription.update({
            where: { stripeSubscriptionId: sub.stripeSubscriptionId },
            data: {
              status: newStatus,
              currentPeriodStart: newPeriodStart,
              currentPeriodEnd: newPeriodEnd,
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              ...(priceId && { stripePriceId: priceId }),
              metadata: { product_key: productKey },
              planId: plan?.id ?? null,
            },
          })

          revalidateTag(`subscriptions:${sub.organizationId}`)
          revalidateTag(`modules:${sub.organizationId}`)
          updated++

          console.log(
            `[sync-subscriptions-cron] ${sub.stripeSubscriptionId} ${sub.status} → ${newStatus} (org: ${sub.organizationId})`,
          )
        } catch (err) {
          errors++
          console.error(
            `[sync-subscriptions-cron] Erro ao sincronizar ${sub.stripeSubscriptionId}:`,
            err,
          )
        }
      }),
    )
  }

  const durationMs = Date.now() - startMs
  console.log(
    `[sync-subscriptions-cron] Concluído — checked: ${checked}, updated: ${updated}, errors: ${errors}, durationMs: ${durationMs}`,
  )

  return NextResponse.json({ checked, updated, errors, durationMs })
}
