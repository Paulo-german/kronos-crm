import 'server-only'

import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from './reports-types'

export function makeReportsCacheKey(
  scope: string,
  ctx: RBACContext,
  dateRange: DateRange,
  extra: Record<string, unknown> = {},
): string[] {
  const elevated = isElevated(ctx.userRole)
  const extraKey = JSON.stringify(extra, Object.keys(extra).sort())
  return [
    `reports-${scope}-${ctx.orgId}-${ctx.userId}-${elevated}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}-${extraKey}`,
  ]
}
