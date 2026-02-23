'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { bulkDeleteDealsSchema } from './schema'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const bulkDeleteDeals = orgActionClient
  .schema(bulkDeleteDealsSchema)
  .action(async ({ parsedInput: { ids }, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar)
    requirePermission(canPerformAction(ctx, 'deal', 'delete'))

    // 2. Query Otimizada (deleteMany)
    const result = await db.deal.deleteMany({
      where: {
        id: { in: ids },
        organizationId: ctx.orgId,
      },
    })

    // 3. Revalidação
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)
    revalidatePath('/crm/deals/pipeline')
    revalidatePath('/crm/deals/list')

    return { count: result.count }
  })
