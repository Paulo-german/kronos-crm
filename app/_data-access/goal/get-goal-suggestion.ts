import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { subMonths } from 'date-fns'
import type { GoalType, GoalScope } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac/types'
import type { GoalSuggestionResult } from './shared/goal-types'
import { computeGoalPeriod } from './shared/compute-goal-period'
import { computeGoalProgress } from './shared/compute-goal-progress'

// Sugestão é estável durante o dia — só precisa atualizar quando novos meses entram na janela.
const SUGGESTION_CACHE_TTL = 86400
// Olhamos os últimos N meses fechados para extrapolar a meta sugerida.
const LOOKBACK_MONTHS = 3
// targetValue dummy passado ao calculador — não é usado no cálculo do actual, apenas no percent.
const DUMMY_TARGET = 1

interface GoalSuggestionInput {
  type: GoalType
  scope: GoalScope
  targetUserId?: string | null
  targetPipelineId?: string | null
}

export const getGoalSuggestion = cache(
  async (
    ctx: RBACContext,
    input: GoalSuggestionInput,
  ): Promise<GoalSuggestionResult> => {
    const cacheKey = `goal-suggestion-${ctx.orgId}-${input.type}-${input.scope}-${input.targetUserId ?? ''}-${input.targetPipelineId ?? ''}`

    const getCached = unstable_cache(
      async () => {
        const now = new Date()
        const windows = Array.from({ length: LOOKBACK_MONTHS }, (_, index) =>
          computeGoalPeriod('MONTHLY', subMonths(now, LOOKBACK_MONTHS - index)),
        )

        const monthlyValues = await Promise.all(
          windows.map(async ({ periodStart, periodEnd }) => {
            const result = await computeGoalProgress({
              goal: {
                type: input.type,
                scope: input.scope,
                targetUserId: input.targetUserId ?? null,
                targetPipelineId: input.targetPipelineId ?? null,
                periodStart,
                periodEnd,
                targetValue: DUMMY_TARGET,
                organizationId: ctx.orgId,
              },
            })
            return result.actual
          }),
        )

        const hasEnoughData = monthlyValues.every((value) => value > 0)
        const total = monthlyValues.reduce((sum, value) => sum + value, 0)
        const suggested = Math.round(total / monthlyValues.length)

        return { suggested, monthlyValues, hasEnoughData }
      },
      [cacheKey],
      { tags: [`goals:${ctx.orgId}`], revalidate: SUGGESTION_CACHE_TTL },
    )
    return getCached()
  },
)
