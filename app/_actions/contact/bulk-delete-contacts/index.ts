'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { bulkDeleteContactsSchema } from './schema'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const bulkDeleteContacts = orgActionClient
  .schema(bulkDeleteContactsSchema)
  .action(async ({ parsedInput: { ids }, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar)
    requirePermission(canPerformAction(ctx, 'contact', 'delete'))

    // 2. Query Otimizada (deleteMany)
    // Garante segurança verificando se pertence à organização
    const result = await db.contact.deleteMany({
      where: {
        id: { in: ids },
        organizationId: ctx.orgId,
      },
    })

    // 3. Revalidação
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidatePath('/contacts')

    return { count: result.count }
  })
