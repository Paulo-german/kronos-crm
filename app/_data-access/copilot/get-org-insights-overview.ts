import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { SCORE_RED_MAX, SCORE_YELLOW_MAX } from '@/../trigger/lib/health-score-constants'
import type { InsightsBucketDto, InsightsOverviewDto, ScoreBucketLabel } from './shared/insights-types'
import { makeInsightsCacheKey } from './shared/insights-cache'
import { STALE_DEAL_DAYS, REACTIVATION_MIN_LTV } from './shared/insights-constants'

const DAY_MS = 24 * 60 * 60 * 1000

// COLD é intencionalmente excluído: contato frio é pré-pipeline (ainda não levantou a mão),
// não deve poluir as métricas de saúde do pipeline ativo. CUSTOMER também fica de fora (pós-venda).
const PIPELINE_STAGES = ['LEAD', 'QUALIFIED', 'OPPORTUNITY'] as const

function scoreLabel(score: number): ScoreBucketLabel {
  if (score <= SCORE_RED_MAX) return 'red'
  if (score <= SCORE_YELLOW_MAX) return 'yellow'
  return 'green'
}

interface ScoredContactRow {
  healthScore: number | null
  scoredAt: Date | null
}

function buildBucket(rows: ScoredContactRow[]): InsightsBucketDto {
  const scored = rows.filter((row): row is { healthScore: number; scoredAt: Date | null } => row.healthScore !== null)
  const total = scored.length

  if (total === 0) {
    return {
      score: 0,
      scoreLabel: 'red',
      total: 0,
      atRisk: 0,
      needsAttention: 0,
      healthy: 0,
    }
  }

  let sum = 0
  let atRisk = 0
  let needsAttention = 0
  let healthy = 0

  for (const row of scored) {
    const value = row.healthScore
    sum += value
    if (value <= SCORE_RED_MAX) {
      atRisk += 1
      continue
    }
    if (value <= SCORE_YELLOW_MAX) {
      needsAttention += 1
      continue
    }
    healthy += 1
  }

  const avg = Math.round(sum / total)

  return {
    score: avg,
    scoreLabel: scoreLabel(avg),
    total,
    atRisk,
    needsAttention,
    healthy,
  }
}

const fetchOverviewFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<InsightsOverviewDto> => {
  const assigneeFilter = elevated ? {} : { assignedTo: userId }
  const staleThreshold = new Date(Date.now() - STALE_DEAL_DAYS * DAY_MS)

  const baseScoredWhere: Prisma.ContactWhereInput = {
    organizationId: orgId,
    healthScore: { not: null },
    scoredAt: { not: null },
    ...assigneeFilter,
  }

  // Os 4 selects/contagens rodam em paralelo para minimizar round-trip
  const [customers, pipeline, stalledDeals, reactivationCandidates] = await Promise.all([
    db.contact.findMany({
      where: { ...baseScoredWhere, lifecycleStage: 'CUSTOMER' },
      select: { healthScore: true, scoredAt: true },
    }),
    db.contact.findMany({
      where: { ...baseScoredWhere, lifecycleStage: { in: [...PIPELINE_STAGES] } },
      select: { healthScore: true, scoredAt: true },
    }),
    db.deal.count({
      where: {
        organizationId: orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        updatedAt: { lt: staleThreshold },
        ...(elevated ? {} : { assignedTo: userId }),
      },
    }),
    db.contact.count({
      where: {
        organizationId: orgId,
        lifecycleStage: 'CUSTOMER',
        customerStatus: 'DORMANT',
        ...assigneeFilter,
        deals: {
          some: {
            deal: {
              status: 'WON',
              value: { gte: REACTIVATION_MIN_LTV },
            },
          },
        },
      },
    }),
  ])

  // scoredAt mais recente entre os dois buckets combinados
  let latestScoredAt: Date | null = null
  for (const row of [...customers, ...pipeline]) {
    if (!row.scoredAt) continue
    if (!latestScoredAt || row.scoredAt > latestScoredAt) {
      latestScoredAt = row.scoredAt
    }
  }

  return {
    customers: buildBucket(customers),
    pipeline: buildBucket(pipeline),
    counts: {
      stalledDeals,
      reactivationCandidates,
    },
    scoredAt: latestScoredAt,
  }
}

export const getOrgInsightsOverview = async (
  ctx: RBACContext,
): Promise<InsightsOverviewDto> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchOverviewFromDb(ctx.orgId, ctx.userId, elevated),
    makeInsightsCacheKey('overview', ctx, ''),
    {
      tags: [`copilot:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
