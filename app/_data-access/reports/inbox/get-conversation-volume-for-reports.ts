import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getConversationVolume } from '@/_data-access/dashboard/get-conversation-volume'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  ConversationVolumeByDay,
  InboxDashboardFilters,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type { ConversationVolumeByDay } from '@/_data-access/dashboard/inbox-dashboard-types'

export const getConversationVolumeForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<ConversationVolumeByDay[]> => {
    const getCached = unstable_cache(
      async () => getConversationVolume(ctx, dateRange, filters),
      makeReportsCacheKey('inbox-volume', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
