import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAiMetrics } from '@/_data-access/dashboard/get-ai-metrics'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange, ReportsFilters } from '../shared/reports-types'
import type { AiMetrics } from '@/_data-access/dashboard/types'

const CACHE_REVALIDATE_SECONDS = 3600

// Reexporta o DTO da camada de dashboard — reports é apenas uma view com tag de cache distinta
export type { AiMetrics } from '@/_data-access/dashboard/types'

export const getAiMetricsForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: ReportsFilters = {},
  ): Promise<AiMetrics> => {
    // O consumo de IA (créditos/mensagens) é agregado por organização e período em `AiUsage`,
    // que NÃO carrega dimensão de `assignee`. Por isso o filtro por membro entra apenas na cache
    // key (mantendo a API consistente com as demais abas e segregando o cache por filtro), mas as
    // métricas continuam sendo da org inteira — não há como particioná-las por responsável no
    // modelo de dados atual sem alterar a camada de dashboard.
    const getCached = unstable_cache(
      async () => getAiMetrics(ctx.orgId, dateRange),
      makeReportsCacheKey('ai-metrics', ctx, dateRange, filters),
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
