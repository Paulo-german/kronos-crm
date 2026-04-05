import 'server-only'
import { db } from '@/_lib/prisma'

/**
 * Verifica se uma organização possui plano ativo de forma leve e direta.
 * Usado em API routes (webhooks) onde cache React não funciona e o overhead
 * do unstable_cache seria desnecessário para um check pontual.
 *
 * Cascata:
 * 1. planOverrideId não-nulo → true (grant interno/parceiro)
 * 2. Subscription ativa ou em trial → true
 * 3. trialEndsAt no futuro → true (orgs legadas com trial)
 * 4. Nenhuma das anteriores → false
 */
export async function hasActivePlan(orgId: string): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planOverrideId: true,
      trialEndsAt: true,
      subscriptions: {
        where: { status: { in: ['active', 'trialing'] } },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!org) return false

  if (org.planOverrideId) return true

  if (org.subscriptions.length > 0) return true

  if (org.trialEndsAt && org.trialEndsAt > new Date()) return true

  return false
}
