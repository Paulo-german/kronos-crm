import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { PendingTask } from './types'

async function fetchPendingTasks(
  orgId: string,
  userId: string,
): Promise<PendingTask[]> {
  const tasks = await db.task.findMany({
    where: {
      organizationId: orgId,
      isCompleted: false,
      assignedTo: userId,
    },
    include: {
      deal: { select: { title: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 6,
  })

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: task.type,
    dueDate: task.dueDate,
    dealId: task.dealId,
    dealTitle: task.deal.title,
  }))
}

export const getPendingTasks = cache(
  async (orgId: string, userId: string): Promise<PendingTask[]> => {
    const getCached = unstable_cache(
      async () => fetchPendingTasks(orgId, userId),
      [`dashboard-tasks-${orgId}-${userId}`],
      {
        tags: [`dashboard:${orgId}`, `tasks:${orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
