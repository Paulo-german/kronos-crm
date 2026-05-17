import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
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
  HEALTH_SCORE_RISK_THRESHOLD,
  LIFECYCLE_EVOLUTION_MONTHS,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import { LIFECYCLE_STAGE_ORDER } from '@/_lib/lifecycle/lifecycle-stage-config'
import { buildContactWhereForDashboardV2 } from './shared/build-contact-where'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'

// Status de Deal considerados "em jogo" (entram em openPipelineValue).
// PAUSED é excluído intencionalmente — deal pausado não está ativo no funil.
const ACTIVE_DEAL_STATUSES: DealStatus[] = [DealStatus.OPEN, DealStatus.IN_PROGRESS]

// Labels PT-BR do eixo X do AreaChart (curto, 3 letras) — janela móvel dos últimos 12 meses
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
  // Fluxo: entradas no estágio durante o DateRange (número principal)
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
}

export interface LifecycleEvolutionPoint {
  month: string // "Jan", "Fev", …
  monthIso: string // "2025-01"
  LEAD: number
  QUALIFIED: number
  OPPORTUNITY: number
  CUSTOMER: number
}

export interface LifecycleFunnelMetricsDto {
  stages: LifecycleStageMetrics[]
  evolutionByMonth: LifecycleEvolutionPoint[]
}

// Shape do resultado do groupBy({ by: ['toStage'], _count: { _all: true } })
type StageFlowGroup = {
  toStage: LifecycleStage
  _count: { _all: number }
}

// Constrói um mapa stage → count a partir do resultado de groupBy
function tallyByStage(groups: StageFlowGroup[]): Record<LifecycleStage, number> {
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

// Cria o array de 12 pontos mensais preenchendo zeros para meses sem transição,
// garantindo eixo X contínuo no AreaChart mesmo em orgs com pouco histórico.
function buildEvolutionPoints(
  historyRows: Array<{ toStage: LifecycleStage; createdAt: Date }>,
  monthsWindow: number,
): LifecycleEvolutionPoint[] {
  // Agrupa transições por (yyyy-MM, stage)
  const tallyByMonth = new Map<string, Record<LifecycleStage, number>>()
  for (const row of historyRows) {
    const monthIso = row.createdAt.toISOString().substring(0, 7)
    const existing = tallyByMonth.get(monthIso) ?? {
      [LifecycleStage.LEAD]: 0,
      [LifecycleStage.QUALIFIED]: 0,
      [LifecycleStage.OPPORTUNITY]: 0,
      [LifecycleStage.CUSTOMER]: 0,
    }
    existing[row.toStage] += 1
    tallyByMonth.set(monthIso, existing)
  }

  // Gera N pontos retroativos a partir do mês atual (ordem cronológica)
  const now = new Date()
  const points: LifecycleEvolutionPoint[] = []
  for (let offset = monthsWindow - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const monthIso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = MONTH_LABELS_PT_BR[cursor.getMonth()]
    const stageTally = tallyByMonth.get(monthIso) ?? {
      [LifecycleStage.LEAD]: 0,
      [LifecycleStage.QUALIFIED]: 0,
      [LifecycleStage.OPPORTUNITY]: 0,
      [LifecycleStage.CUSTOMER]: 0,
    }
    points.push({
      month: monthLabel,
      monthIso,
      LEAD: stageTally[LifecycleStage.LEAD],
      QUALIFIED: stageTally[LifecycleStage.QUALIFIED],
      OPPORTUNITY: stageTally[LifecycleStage.OPPORTUNITY],
      CUSTOMER: stageTally[LifecycleStage.CUSTOMER],
    })
  }
  return points
}

async function fetchLifecycleFunnelMetrics(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
): Promise<LifecycleFunnelMetricsDto> {
  const prevRange = getPreviousPeriod(dateRange)

  // RBAC nas queries de ContactLifecycleHistory: MEMBER limita pelo contato atribuído.
  // `BACKFILL` é filtrado em todas as queries de fluxo (origem sintética de migração).
  const historyWhereBase: Prisma.ContactLifecycleHistoryWhereInput = {
    organizationId: orgId,
    causeType: { not: LifecycleCauseType.BACKFILL },
    ...(elevated ? {} : { contact: { assignedTo: userId } }),
  }

  const contactWhereBase = buildContactWhereForDashboardV2(orgId, userId, elevated)

  // Janela do gráfico de evolução: início do mês ocorrido há `LIFECYCLE_EVOLUTION_MONTHS - 1` meses
  const evolutionStart = new Date()
  evolutionStart.setMonth(evolutionStart.getMonth() - (LIFECYCLE_EVOLUTION_MONTHS - 1))
  evolutionStart.setDate(1)
  evolutionStart.setHours(0, 0, 0, 0)

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
    // 9) Evolução mensal — janela fixa de 12 meses (independente do DateRange)
    db.contactLifecycleHistory.findMany({
      where: {
        ...historyWhereBase,
        createdAt: { gte: evolutionStart },
      },
      select: { toStage: true, createdAt: true },
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
      return { ...base, openPipelineValue: Number(openPipelineAgg._sum.value ?? 0) }
    }
    return { ...base, atRiskCount: atRiskCustomerCount }
  })

  const evolutionByMonth = buildEvolutionPoints(evolutionRows, LIFECYCLE_EVOLUTION_MONTHS)

  return { stages, evolutionByMonth }
}

export const getLifecycleFunnelMetrics = cache(
  async (ctx: RBACContext, dateRange: DateRange): Promise<LifecycleFunnelMetricsDto> => {
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
