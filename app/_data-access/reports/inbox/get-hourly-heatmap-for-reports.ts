import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getHourlyHeatmap } from '@/_data-access/dashboard/get-hourly-heatmap'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  HourlyHeatmapEntry,
  InboxDashboardFilters,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { HourlyHeatmapEntry } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getHourlyHeatmapForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<HourlyHeatmapEntry[]> => {
    const getCached = unstable_cache(
      async () => getHourlyHeatmap(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-heatmap', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
