import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAiMetrics } from '@/_data-access/dashboard/get-ai-metrics'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type { AiMetrics } from '@/_data-access/dashboard/types'

const CACHE_REVALIDATE_SECONDS = 3600

// Reexporta o DTO da camada de dashboard — reports é apenas uma view com tag de cache distinta
export type { AiMetrics } from '@/_data-access/dashboard/types'

export const getAiMetricsForReports = cache(
  async (ctx: RBACContext, dateRange: DateRange): Promise<AiMetrics> => {
    const getCached = unstable_cache(
      async () => getAiMetrics(ctx.orgId, dateRange),
      makeReportsCacheKey('ai-metrics', ctx, dateRange),
      {
        // Tags pareiam com as invalidações já emitidas pelas actions de IA do dashboard
        // (dashboard-ai/credits/agents). Adicionamos `reports:` para isolamento por view.
        tags: [
          `reports:${ctx.orgId}`,
          `dashboard-ai:${ctx.orgId}`,
          `credits:${ctx.orgId}`,
          `agents:${ctx.orgId}`,
        ],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
