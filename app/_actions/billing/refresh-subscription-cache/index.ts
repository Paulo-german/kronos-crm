'use server'

import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
// freeOrgActionClient é usado aqui porque esta action precisa funcionar para orgs
// sem plano ativo (ex: trial expirado aguardando confirmação do webhook Stripe).
// É uma exceção legítima ao orgActionClient padrão — exclusiva para billing-adjacent.
import { freeOrgActionClient } from '@/_lib/safe-action'
import { refreshSubscriptionCacheSchema } from './schema'

export const refreshSubscriptionCache = freeOrgActionClient
  .schema(refreshSubscriptionCacheSchema)
  .action(async ({ ctx }) => {
    // RBAC: qualquer membro com permissão de leitura de billing pode forçar o refresh
    requirePermission(canPerformAction(ctx, 'billing', 'read'))

    // Invalida a tag usada por todos os data-access de subscription da org
    // (getEffectivePlan, getTrialStatus, getActiveSubscription, etc.)
    revalidateTag(`subscriptions:${ctx.orgId}`)

    return { success: true, refreshedAt: Date.now() }
  })
