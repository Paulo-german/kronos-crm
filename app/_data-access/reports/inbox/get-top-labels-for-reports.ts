import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getTopLabels } from '@/_data-access/dashboard/get-top-labels'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  InboxDashboardFilters,
  TopLabel,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { TopLabel } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getTopLabelsForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<TopLabel[]> => {
    const getCached = unstable_cache(
      async () => getTopLabels(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-labels', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
