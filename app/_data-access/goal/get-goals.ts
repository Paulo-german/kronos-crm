import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac/permissions'
import type { RBACContext } from '@/_lib/rbac/types'
import type { GoalDto, GoalWithProgressDto } from './shared/goal-types'
import { computeGoalProgress } from './shared/compute-goal-progress'

// Cache curto para a versão com progresso porque os agregados mudam a cada mutação de Deal/Activity/Conversation.
const PROGRESS_CACHE_TTL = 60
// Cache longo para a versão sem progresso porque o registro de Goal só muda em mutações próprias.
const LIST_CACHE_TTL = 3600

async function fetchGoalsFromDb(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<GoalDto[]> {
  const goals = await db.goal.findMany({
    where: {
      organizationId: orgId,
      // MEMBER vê metas ORG/PIPELINE (compartilhadas) + metas próprias (MEMBER + targetUserId = self).
      ...(!elevated && {
        OR: [
          { scope: 'ORG' },
          { scope: 'PIPELINE' },
          { scope: 'MEMBER', targetUserId: userId },
        ],
      }),
    },
    include: {
      targetUser: { select: { fullName: true } },
      targetPipeline: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return goals.map((goal) => ({
    id: goal.id,
    type: goal.type,
    scope: goal.scope,
    period: goal.period,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
    targetUserId: goal.targetUserId,
    targetUserName: goal.targetUser?.fullName ?? null,
    targetPipelineId: goal.targetPipelineId,
    targetPipelineName: goal.targetPipeline?.name ?? null,
    targetValue: Number(goal.targetValue),
    createdBy: goal.createdBy,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  }))
}

export const getGoals = cache(async (ctx: RBACContext): Promise<GoalDto[]> => {
  const elevated = isElevated(ctx.userRole)
  const getCached = unstable_cache(
    async () => fetchGoalsFromDb(ctx.orgId, ctx.userId, elevated),
    [`goals-${ctx.orgId}-${ctx.userId}-${elevated}`],
    { tags: [`goals:${ctx.orgId}`], revalidate: LIST_CACHE_TTL },
  )
  return getCached()
})

export const getGoalsWithProgress = cache(
  async (ctx: RBACContext): Promise<GoalWithProgressDto[]> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => {
        const goals = await fetchGoalsFromDb(ctx.orgId, ctx.userId, elevated)
        return Promise.all(
          goals.map(async (goal) => ({
            ...goal,
            progress: await computeGoalProgress({
              goal: { ...goal, organizationId: ctx.orgId },
            }),
          })),
        )
      },
      [`goals-progress-${ctx.orgId}-${ctx.userId}-${elevated}`],
      { tags: [`goals:${ctx.orgId}`], revalidate: PROGRESS_CACHE_TTL },
    )
    return getCached()
  },
)
