import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAttendantPerformance } from '@/_data-access/dashboard/get-attendant-performance'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  AttendantPerformance,
  InboxDashboardFilters,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { AttendantPerformance } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getAttendantPerformanceForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<AttendantPerformance[]> => {
    const getCached = unstable_cache(
      async () => getAttendantPerformance(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-attendants', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
