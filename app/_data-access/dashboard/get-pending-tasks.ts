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

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    dueDate: t.dueDate,
    dealId: t.dealId,
    dealTitle: t.deal.title,
  }))
}

export const getPendingTasks = cache(
  async (orgId: string, userId: string): Promise<PendingTask[]> => {
    const getCached = unstable_cache(
      async () => fetchPendingTasks(orgId, userId),
      [`dashboard-tasks-${orgId}-${userId}`],
      {
        tags: [`dashboard:${orgId}`, `tasks:${orgId}`],
        revalidate: 300,
      },
    )

    return getCached()
  },
)
