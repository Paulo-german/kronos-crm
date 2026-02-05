'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeDealContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  findContactWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const removeDealContact = orgActionClient
  .schema(removeDealContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Verificar se o contato é acessível pelo usuário
    await findContactWithRBAC(data.contactId, ctx)

    // 4. Remove o contato do deal
    await db.dealContact.delete({
      where: {
        dealId_contactId: {
          dealId: data.dealId,
          contactId: data.contactId,
        },
      },
    })

    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
