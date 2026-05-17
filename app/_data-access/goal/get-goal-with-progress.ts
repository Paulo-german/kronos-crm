import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac/permissions'
import type { RBACContext } from '@/_lib/rbac/types'
import type { GoalWithProgressDto } from './shared/goal-types'
import { computeGoalProgress } from './shared/compute-goal-progress'

const DETAIL_CACHE_TTL = 60

export const getGoalWithProgress = cache(
  async (ctx: RBACContext, goalId: string): Promise<GoalWithProgressDto | null> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => {
        const goal = await db.goal.findFirst({
          where: {
            id: goalId,
            organizationId: ctx.orgId,
            ...(!elevated && {
              OR: [
                { scope: 'ORG' },
                { scope: 'PIPELINE' },
                { scope: 'MEMBER', targetUserId: ctx.userId },
              ],
            }),
          },
          include: {
            targetUser: { select: { fullName: true } },
            targetPipeline: { select: { name: true } },
          },
        })

        if (!goal) return null

        const goalDto = {
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
        }

        const progress = await computeGoalProgress({
          goal: { ...goalDto, organizationId: ctx.orgId },
        })
        return { ...goalDto, progress }
      },
      [`goal-${goalId}-${ctx.orgId}-${ctx.userId}-${elevated}`],
      { tags: [`goals:${ctx.orgId}`], revalidate: DETAIL_CACHE_TTL },
    )
    return getCached()
  },
)
