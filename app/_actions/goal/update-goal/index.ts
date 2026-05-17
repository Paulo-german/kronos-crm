'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import type { GoalPeriod } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { computeGoalPeriod } from '@/_data-access/goal/shared/compute-goal-period'
import { updateGoalSchema } from './schema'

export const updateGoal = orgActionClient
  .schema(updateGoalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'goal', 'update'))

    const existing = await db.goal.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })
    if (!existing) throw new Error('Meta não encontrada.')

    let periodFields: { period?: GoalPeriod; periodStart?: Date; periodEnd?: Date } = {}

    if (data.period && data.period !== existing.period) {
      const { periodStart, periodEnd } = computeGoalPeriod(data.period, new Date())

      // Recheca duplicidade ao mudar o período — preserva a invariância validada no create.
      const duplicate = await db.goal.findFirst({
        where: {
          organizationId: ctx.orgId,
          type: existing.type,
          scope: existing.scope,
          targetUserId: existing.targetUserId,
          targetPipelineId: existing.targetPipelineId,
          period: data.period,
          periodStart,
          id: { not: existing.id },
        },
        select: { id: true },
      })
      if (duplicate) {
        throw new Error('Já existe uma meta deste tipo para o novo período.')
      }

      periodFields = { period: data.period, periodStart, periodEnd }
    }

    await db.goal.update({
      where: { id: data.id },
      data: {
        ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
        ...periodFields,
      },
    })

    revalidateTag(`goals:${ctx.orgId}`)
    revalidatePath('/settings/goals')
    return { success: true }
  })
