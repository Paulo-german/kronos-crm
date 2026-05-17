import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getChannelDistribution } from '@/_data-access/dashboard/get-channel-distribution'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  ChannelDistribution,
  InboxDashboardFilters,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { ChannelDistribution } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getChannelDistributionForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<ChannelDistribution[]> => {
    const getCached = unstable_cache(
      async () => getChannelDistribution(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-channels', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
