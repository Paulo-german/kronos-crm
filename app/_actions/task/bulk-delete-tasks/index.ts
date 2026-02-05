'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { bulkDeleteTasksSchema } from './schema'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'

export const bulkDeleteTasks = orgActionClient
  .schema(bulkDeleteTasksSchema)
  .action(async ({ parsedInput: { ids }, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'delete'))

    // 2. Para MEMBER, só pode deletar próprias tasks
    // Para ADMIN/OWNER, pode deletar qualquer task da org
    const whereClause = {
      id: { in: ids },
      organizationId: ctx.orgId,
      // MEMBER só pode deletar próprias
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
    }

    const result = await db.task.deleteMany({
      where: whereClause,
    })

    // 3. Revalidação
    revalidateTag(`tasks:${ctx.orgId}`)
    revalidatePath('/tasks')
    revalidatePath('/pipeline')

    return { count: result.count }
  })
