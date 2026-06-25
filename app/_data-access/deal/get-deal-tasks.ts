import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DealTaskDto } from './get-deal-details'

const fetchDealTasksFromDb = async (
  dealId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealTaskDto[]> => {
  const tasks = await db.crmTask.findMany({
    where: {
      dealId,
      // RBAC pelo dono do deal — MEMBER só acessa os próprios.
      deal: {
        organizationId: orgId,
        ...(elevated ? {} : { assignedTo: userId }),
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: task.type,
    dueDate: task.dueDate,
    isCompleted: task.isCompleted,
    dealId,
    outcomeType: task.outcomeType,
    outcomeNotes: task.outcomeNotes,
  }))
}

/**
 * Tarefas de um deal, carregadas sob demanda pela aba Tarefas
 * (fora da query base de getDealDetails).
 */
export const getDealTasks = cache(
  async (dealId: string, ctx: RBACContext): Promise<DealTaskDto[]> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () => fetchDealTasksFromDb(dealId, ctx.orgId, ctx.userId, elevated),
      [`deal-tasks-${dealId}-${ctx.userId}-${elevated}`],
      {
        tags: [`deal:${dealId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
