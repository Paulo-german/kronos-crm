import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getInboxKpiMetrics } from '@/_data-access/dashboard/get-inbox-kpi-metrics'
import { getPreviousPeriod } from '@/_utils/date-range'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { RBACContext } from '@/_lib/rbac'
import type { DateRange } from '../shared/reports-types'
import type {
  InboxDashboardFilters,
  InboxKpiMetrics,
} from '@/_data-access/dashboard/inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600

// Reexporta o DTO da camada de dashboard — reports é apenas uma view com tag de cache distinta
export type { InboxKpiMetrics } from '@/_data-access/dashboard/inbox-dashboard-types'

// NOTA SEMÂNTICA (Não Respondidas): o KPI `unansweredConversations` é, por design, um SNAPSHOT do
// estado atual (OPEN com lastMessageRole=user), e NÃO é recortado pelo período selecionado. Isso é
// intencional e consistente em toda a stack: a query em `getInboxKpiMetrics` omite o filtro de data,
// o DTO documenta "sem filtro de período" e o card na UI ("Não Respondidas") não exibe variação
// período-a-período. A intenção é responder "o que precisa de atenção agora?", não "quantas ficaram
// sem resposta no intervalo X". Adicionar um filtro `createdAt` aqui quebraria esse contrato, pois
// esconderia conversas abertas hoje que foram criadas antes da janela. Mantemos o snapshot.

export const getInboxKpiMetricsForReports = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<InboxKpiMetrics> => {
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () => getInboxKpiMetrics(ctx, dateRange, prevRange, filters),
      makeReportsCacheKey('inbox-kpi', ctx, dateRange, filters),
      {
        tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
