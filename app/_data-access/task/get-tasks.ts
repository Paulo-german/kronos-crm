import 'server-only'

import { db } from '@/_lib/prisma'

export type TaskDto = {
  id: string
  title: string
  type: string // Vamos tipar como string no DTO para simplificar no front, ou importar TaskType
  dueDate: Date | null
  isCompleted: boolean
  dealId: string | null
  deal: {
    title: string
  } | null
  createdAt: Date
}

export const getTasks = async (userId: string): Promise<TaskDto[]> => {
  const tasks = await db.task.findMany({
    where: {
      OR: [{ assignedTo: userId }, { createdBy: userId }],
    },
    orderBy: [
      { isCompleted: 'asc' }, // Pendentes primeiro
      { dueDate: 'asc' }, // Depois por data
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
      isCompleted: true,
      dealId: true,
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
