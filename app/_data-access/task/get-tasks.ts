import 'server-only'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type TaskDto = {
  id: string
  title: string
  type: string
  dueDate: Date | null
  isCompleted: boolean
  dealId: string | null
  deal: {
    title: string
  } | null
  assignedTo: string
  createdAt: Date
}

/**
 * Busca todas as tarefas da organização
 * RBAC: MEMBER só vê tarefas atribuídas a ele
 */
export const getTasks = async (ctx: RBACContext): Promise<TaskDto[]> => {
  const tasks = await db.task.findMany({
    where: {
      organizationId: ctx.orgId,
      // RBAC: MEMBER só vê próprias, ADMIN/OWNER vê todas
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
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
      createdAt: true,
    },
  })

  return tasks
}
