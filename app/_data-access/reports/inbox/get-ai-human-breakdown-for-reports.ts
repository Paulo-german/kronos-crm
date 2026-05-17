import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAiHumanBreakdown } from '@/_data-access/dashboard/get-ai-human-breakdown'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  AiHumanBreakdown,
  InboxDashboardFilters,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { AiHumanBreakdown } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getAiHumanBreakdownForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<AiHumanBreakdown> => {
    const getCached = unstable_cache(
      async () => getAiHumanBreakdown(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-ai-human', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
