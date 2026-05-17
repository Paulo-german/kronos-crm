import 'server-only'

import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from './reports-types'

export function makeReportsCacheKey(
  scope: string,
  ctx: RBACContext,
  dateRange: DateRange,
  // Aceita qualquer interface tipada (ReportsFilters, InboxDashboardFilters etc.) sem exigir
  // index signature `[key: string]: unknown`. Serializamos via JSON.stringify, então só
  // precisamos que seja um objeto serializável.
  extra: object = {},
): string[] {
  const elevated = isElevated(ctx.userRole)
  const extraKey = JSON.stringify(extra, Object.keys(extra).sort())
  return [
    `reports-${scope}-${ctx.orgId}-${ctx.userId}-${elevated}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}-${extraKey}`,
  ]
}
