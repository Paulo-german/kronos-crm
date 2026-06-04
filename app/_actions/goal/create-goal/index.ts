'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { computeGoalPeriod } from '@/_data-access/goal/shared/compute-goal-period'
import {
  assertPipelineBelongsToOrg,
  assertUserBelongsToOrg,
} from '@/_lib/cross-org-guards'
import { createGoalSchema } from './schema'

export const createGoal = orgActionClient
  .schema(createGoalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'goal', 'create'))

    const { periodStart, periodEnd } = computeGoalPeriod(data.period, new Date())

    if (data.targetPipelineId) {
      await assertPipelineBelongsToOrg(data.targetPipelineId, ctx.orgId)
    }
    if (data.targetUserId) {
      await assertUserBelongsToOrg(data.targetUserId, ctx.orgId)
    }

    // Bloqueia duplicidade de meta no mesmo escopo/tipo/período — evita disputa silenciosa de dados.
    const duplicate = await db.goal.findFirst({
      where: {
        organizationId: ctx.orgId,
        type: data.type,
        scope: data.scope,
        targetUserId: data.targetUserId ?? null,
        targetPipelineId: data.targetPipelineId ?? null,
        period: data.period,
        periodStart,
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new Error('Já existe uma meta deste tipo para o mesmo escopo e período.')
    }

    const goal = await db.goal.create({
      data: {
        organizationId: ctx.orgId,
        type: data.type,
        scope: data.scope,
        period: data.period,
        periodStart,
        periodEnd,
        targetUserId: data.targetUserId ?? null,
        targetPipelineId: data.targetPipelineId ?? null,
        targetValue: data.targetValue,
        createdBy: ctx.userId,
      },
    })

    revalidateTag(`goals:${ctx.orgId}`)
    revalidatePath('/org/[orgSlug]/crm/settings/goals', 'page')
    return { success: true, goalId: goal.id }
  })
