import 'server-only'

import type { DateRange } from '@/_data-access/dashboard/types'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'

/**
 * Helper para construir chaves de cache (`unstable_cache`) das queries do dashboard v2.
 *
 * Inclui no key: scope, orgId, userId, papel (elevated vs MEMBER) e — opcionalmente —
 * o DateRange e um objeto `extra` arbitrário (serializado com chaves ordenadas para
 * gerar uma string estável independente da ordem de inserção).
 *
 * O `userId` faz parte do key porque MEMBER vê um subconjunto dos dados, então o cache
 * precisa ser segregado por usuário para evitar vazamento entre papéis.
 */
export function makeDashboardV2CacheKey(
  scope: string,
  ctx: RBACContext,
  dateRange?: DateRange,
  extra: Record<string, unknown> = {},
): string[] {
  const elevated = isElevated(ctx.userRole)
  const extraKey = JSON.stringify(extra, Object.keys(extra).sort())
  const dateKey = dateRange
    ? `${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`
    : 'no-range'
  return [
    `dashboard-v2-${scope}-${ctx.orgId}-${ctx.userId}-${elevated}-${dateKey}-${extraKey}`,
  ]
}
