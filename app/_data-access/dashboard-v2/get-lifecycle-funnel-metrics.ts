import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import {
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  getMonth,
  startOfWeek,
} from 'date-fns'
import {
  DealStatus,
  LifecycleCauseType,
  LifecycleStage,
  type Prisma,
} from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import type { DateRange } from '@/_data-access/dashboard/types'
import { getPreviousPeriod } from '@/_utils/date-range'
import {
  DASHBOARD_V2_CACHE_REVALIDATE_S,
  EVOLUTION_DAILY_MAX_DAYS,
  EVOLUTION_WEEKLY_MAX_DAYS,
  HEALTH_SCORE_RISK_THRESHOLD,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import { LIFECYCLE_STAGE_ORDER } from '@/_lib/lifecycle/lifecycle-stage-config'
import { buildContactWhereForDashboardV2 } from './shared/build-contact-where'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'

// Status de Deal considerados "em jogo" (entram em openPipelineValue).
// PAUSED é excluído intencionalmente — deal pausado não está ativo no funil.
const ACTIVE_DEAL_STATUSES: DealStatus[] = [
  DealStatus.OPEN,
  DealStatus.IN_PROGRESS,
]

// Labels PT-BR para o eixo X mensal do gráfico de evolução (curto, 3 letras)
const MONTH_LABELS_PT_BR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

export interface LifecycleStageMetrics {
  stage: LifecycleStage
  // Fluxo: todas as entradas no estágio durante o DateRange (inclui múltiplas entradas do mesmo contato)
  periodCount: number
  prevPeriodCount: number
  // Estoque: snapshot atual de contatos no estágio (footnote)
  stockCount: number
  // Sub-info contextual — apenas o campo relevante ao estágio é populado
  autoCaptureCount?: number
  aiQualifiedCount?: number
  aiQualifiedTotal?: number
  openPipelineValue?: number
  atRiskCount?: number
  // CUSTOMER: contatos distintos que entraram no estágio no período (sem dupla-contagem por revertências)
  uniqueCustomerCount?: number
}

export interface LifecycleEvolutionPoint {
  // Label exibido no eixo X — formato depende da granularidade ("09/06", "Jun", etc.)
  label: string
  // Chave única do bucket — usada para agrupamento e React key
  bucketKey: string
  LEAD: number
  QUALIFIED: number
  OPPORTUNITY: number
  CUSTOMER: number
}

// Granularidade adaptativa do gráfico — determinada pelo tamanho do dateRange
type EvolutionGranularity = 'day' | 'week' | 'month'

export interface LifecycleFunnelMetricsDto {
  stages: LifecycleStageMetrics[]
  evolutionSeries: LifecycleEvolutionPoint[]
}

// Shape do resultado do groupBy({ by: ['toStage'], _count: { _all: true } })
interface StageFlowGroup {
  toStage: LifecycleStage
  _count: { _all: number }
}

// Constrói um mapa stage → count a partir do resultado de groupBy
function tallyByStage(
  groups: StageFlowGroup[],
): Record<LifecycleStage, number> {
  const tally: Record<LifecycleStage, number> = {
    [LifecycleStage.LEAD]: 0,
    [LifecycleStage.QUALIFIED]: 0,
    [LifecycleStage.OPPORTUNITY]: 0,
    [LifecycleStage.CUSTOMER]: 0,
  }
  for (const group of groups) {
    tally[group.toStage] = group._count._all
  }
  return tally
}

// Determina a granularidade ideal para o gráfico com base no tamanho do range.
function resolveGranularity(dateRange: DateRange): EvolutionGranularity {
  const days = differenceInDays(dateRange.end, dateRange.start)
  if (days <= EVOLUTION_DAILY_MAX_DAYS) return 'day'
  if (days <= EVOLUTION_WEEKLY_MAX_DAYS) return 'week'
  return 'month'
}

// Constrói o array de pontos do gráfico com granularidade adaptativa,
// preenchendo zeros para buckets sem transição (eixo X sempre contínuo).
function buildEvolutionPoints(
  historyRows: Array<{ toStage: LifecycleStage; createdAt: Date }>,
  dateRange: DateRange,
): LifecycleEvolutionPoint[] {
  const granularity = resolveGranularity(dateRange)

  // Normaliza uma data para a chave canônica do seu bucket
  function keyOf(date: Date): string {
    if (granularity === 'day') return format(date, 'yyyy-MM-dd')
    if (granularity === 'week') return format(startOfWeek(date), 'yyyy-MM-dd')
    return format(date, 'yyyy-MM')
  }

  // Agrupa as transições por (bucketKey, stage) em O(n)
  const tallyByBucket = new Map<string, Record<LifecycleStage, number>>()
  for (const row of historyRows) {
    const key = keyOf(row.createdAt)
    const existing = tallyByBucket.get(key) ?? {
      [LifecycleStage.LEAD]: 0,
      [LifecycleStage.QUALIFIED]: 0,
      [LifecycleStage.OPPORTUNITY]: 0,
      [LifecycleStage.CUSTOMER]: 0,
    }
    existing[row.toStage] += 1
    tallyByBucket.set(key, existing)
  }

  // Gera os buckets canônicos do intervalo (garante eixo X contínuo)
  const interval = { start: dateRange.start, end: dateRange.end }
  const bucketStarts =
    granularity === 'day'
      ? eachDayOfInterval(interval)
      : granularity === 'week'
        ? eachWeekOfInterval(interval)
        : eachMonthOfInterval(interval)

  // Mapeia cada bucket para seu ponto do gráfico
  return bucketStarts.map((bucketStart) => {
    const bucketKey = keyOf(bucketStart)
    const label =
      granularity === 'month'
        ? MONTH_LABELS_PT_BR[getMonth(bucketStart)]
        : format(bucketStart, 'dd/MM')
    const stageTally = tallyByBucket.get(bucketKey) ?? {
      [LifecycleStage.LEAD]: 0,
      [LifecycleStage.QUALIFIED]: 0,
      [LifecycleStage.OPPORTUNITY]: 0,
      [LifecycleStage.CUSTOMER]: 0,
    }
    return {
      label,
      bucketKey,
      LEAD: stageTally[LifecycleStage.LEAD],
      QUALIFIED: stageTally[LifecycleStage.QUALIFIED],
      OPPORTUNITY: stageTally[LifecycleStage.OPPORTUNITY],
      CUSTOMER: stageTally[LifecycleStage.CUSTOMER],
    }
  })
}

async function fetchLifecycleFunnelMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
): Promise<LifecycleFunnelMetricsDto> {
  const prevRange = getPreviousPeriod(dateRange)

  // RBAC nas queries de ContactLifecycleHistory: MEMBER limita pelo contato atribuído.
  // Entradas BACKFILL refletem histórico real de negócio reconstruído e devem entrar nos contadores.
  const historyWhereBase: Prisma.ContactLifecycleHistoryWhereInput = {
    organizationId: orgId,
    ...(elevated ? {} : { contact: { assignedTo: userId } }),
  }

  const contactWhereBase = buildContactWhereForDashboardV2(
    orgId,
    userId,
    elevated,
  )

  const [
    currentFlowGroups,
    prevFlowGroups,
    stockGroups,
    autoCaptureLeadCount,
    qualifiedTotalCount,
    qualifiedByAiCount,
    openPipelineAgg,
    atRiskCustomerCount,
    evolutionRows,
    uniqueCustomerRows,
  ] = await Promise.all([
    // 1) Fluxo do período atual: entradas por estágio
    db.contactLifecycleHistory.groupBy({
      by: ['toStage'],
      _count: { _all: true },
      where: {
        ...historyWhereBase,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // 2) Fluxo do período anterior
    db.contactLifecycleHistory.groupBy({
      by: ['toStage'],
      _count: { _all: true },
      where: {
        ...historyWhereBase,
        createdAt: { gte: prevRange.start, lte: prevRange.end },
      },
    }),
    // 3) Estoque atual de contatos por estágio
    db.contact.groupBy({
      by: ['lifecycleStage'],
      _count: { _all: true },
      where: contactWhereBase,
    }),
    // 4) Sub-info LEAD: capturas automáticas no período
    db.captureEvent.count({
      where: {
        organizationId: orgId,
        capturedAutomatically: true,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...(elevated ? {} : { contact: { assignedTo: userId } }),
      },
    }),
    // 5) Sub-info QUALIFIED — total de entradas no período (denominador da fração X/Y)
    db.contactLifecycleHistory.count({
      where: {
        ...historyWhereBase,
        toStage: LifecycleStage.QUALIFIED,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // 6) Sub-info QUALIFIED — qualificados pela IA (numerador)
    db.contactLifecycleHistory.count({
      where: {
        ...historyWhereBase,
        toStage: LifecycleStage.QUALIFIED,
        causeType: LifecycleCauseType.AI_QUALIFICATION,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),
    // 7) Sub-info OPPORTUNITY — soma de Deals ativos em contatos OPPORTUNITY
    db.deal.aggregate({
      _sum: { value: true },
      where: {
        organizationId: orgId,
        status: { in: ACTIVE_DEAL_STATUSES },
        contacts: {
          some: {
            contact: {
              ...contactWhereBase,
              lifecycleStage: LifecycleStage.OPPORTUNITY,
            },
          },
        },
      },
    }),
    // 8) Sub-info CUSTOMER — clientes em risco (snapshot, healthScore < threshold)
    db.contact.count({
      where: {
        ...contactWhereBase,
        lifecycleStage: LifecycleStage.CUSTOMER,
        healthScore: { lt: HEALTH_SCORE_RISK_THRESHOLD },
      },
    }),
    // 9) Evolução por estágio — segue o dateRange selecionado (granularidade adaptativa)
    db.contactLifecycleHistory.findMany({
      where: {
        ...historyWhereBase,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { toStage: true, createdAt: true },
    }),
    // 10) CUSTOMER: contatos distintos que entraram no estágio no período
    db.contactLifecycleHistory.findMany({
      where: {
        ...historyWhereBase,
        toStage: LifecycleStage.CUSTOMER,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      distinct: ['contactId'],
      select: { contactId: true },
    }),
  ])

  const currentTally = tallyByStage(currentFlowGroups)
  const prevTally = tallyByStage(prevFlowGroups)
  const stockTally = tallyByStage(
    stockGroups.map((group) => ({
      toStage: group.lifecycleStage,
      _count: group._count,
    })),
  )

  const stages: LifecycleStageMetrics[] = LIFECYCLE_STAGE_ORDER.map((stage) => {
    const base: LifecycleStageMetrics = {
      stage,
      periodCount: currentTally[stage],
      prevPeriodCount: prevTally[stage],
      stockCount: stockTally[stage],
    }
    if (stage === LifecycleStage.LEAD) {
      return { ...base, autoCaptureCount: autoCaptureLeadCount }
    }
    if (stage === LifecycleStage.QUALIFIED) {
      return {
        ...base,
        aiQualifiedCount: qualifiedByAiCount,
        aiQualifiedTotal: qualifiedTotalCount,
      }
    }
    if (stage === LifecycleStage.OPPORTUNITY) {
      return {
        ...base,
        openPipelineValue: Number(openPipelineAgg._sum.value ?? 0),
      }
    }
    return {
      ...base,
      atRiskCount: atRiskCustomerCount,
      uniqueCustomerCount: uniqueCustomerRows.length,
    }
  })

  const evolutionSeries = buildEvolutionPoints(evolutionRows, dateRange)

  return { stages, evolutionSeries }
}

export const getLifecycleFunnelMetrics = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
  ): Promise<LifecycleFunnelMetricsDto> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () =>
        fetchLifecycleFunnelMetrics(ctx.orgId, ctx.userId, elevated, dateRange),
      makeDashboardV2CacheKey('lifecycle-funnel', ctx, dateRange),
      {
        tags: [
          `dashboard:${ctx.orgId}`,
          `contacts:${ctx.orgId}`,
          `deals:${ctx.orgId}`,
        ],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
