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

// LIMITAÇÃO CONHECIDA (timezone): o heatmap é montado em `getHourlyHeatmap`, que extrai a hora das
// mensagens com `getHours()` — ou seja, no timezone do servidor (UTC em produção), não no timezone
// da organização. O schema atual de `Organization` NÃO possui campo de timezone (apenas
// `Agent.businessHoursTimezone`, que é por agente, não por org), então não há fonte de verdade para
// converter as horas por aqui sem inventar dados. Mantemos UTC até que a org ganhe um timezone
// próprio; quando ela existir, converter com `toZonedTime` (date-fns-tz) antes de extrair a hora.

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
