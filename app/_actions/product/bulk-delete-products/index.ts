'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { bulkDeleteProductsSchema } from './schema'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { invalidateProductCatalogCache } from '@/_lib/cache/invalidate-product-catalog'

export const bulkDeleteProducts = orgActionClient
  .schema(bulkDeleteProductsSchema)
  .action(async ({ parsedInput: { ids }, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar produtos)
    requirePermission(canPerformAction(ctx, 'product', 'delete'))

    // 2. Query Otimizada (deleteMany)
    const result = await db.product.deleteMany({
      where: {
        id: { in: ids },
        organizationId: ctx.orgId,
      },
    })

    // 3. Revalidação
    revalidateTag(`products:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    await invalidateProductCatalogCache(ctx.orgId)

    return { count: result.count }
  })
