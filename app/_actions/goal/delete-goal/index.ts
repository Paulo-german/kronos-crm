'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { deleteGoalSchema } from './schema'

export const deleteGoal = orgActionClient
  .schema(deleteGoalSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'goal', 'delete'))

    const existing = await db.goal.findFirst({
      where: { id, organizationId: ctx.orgId },
      select: { id: true },
    })
    if (!existing) throw new Error('Meta não encontrada.')

    await db.goal.delete({ where: { id } })

    revalidateTag(`goals:${ctx.orgId}`)
    return { success: true }
  })
