import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type TaskDto = {
  id: string
  title: string
  type: string
  dueDate: Date
  isCompleted: boolean
  dealId: string
  deal: {
    title: string
  }
  assignedTo: string
  assignee: {
    fullName: string | null
  } | null
  createdAt: Date
  outcomeType: string | null
  outcomeNotes: string | null
}

const fetchTasksFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<TaskDto[]> => {
  return db.crmTask.findMany({
    where: {
      organizationId: orgId,
      // RBAC: MEMBER só vê próprias, ADMIN/OWNER vê todas
      ...(elevated ? {} : { assignedTo: userId }),
    },
    orderBy: [
      { isCompleted: 'asc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
      isCompleted: true,
      dealId: true,
      assignedTo: true,
      deal: {
        select: {
          title: true,
        },
      },
      assignee: {
        select: {
          fullName: true,
        },
      },
      createdAt: true,
      outcomeType: true,
      outcomeNotes: true,
    },
  })
}

/**
 * Busca todas as tarefas da organização (Cacheado)
 * RBAC: MEMBER só vê tarefas atribuídas a ele
 */
export const getTasks = async (ctx: RBACContext): Promise<TaskDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchTasksFromDb(ctx.orgId, ctx.userId, elevated),
    [`tasks-${ctx.orgId}-${ctx.userId}-${elevated}`],
    {
      tags: [`tasks:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
