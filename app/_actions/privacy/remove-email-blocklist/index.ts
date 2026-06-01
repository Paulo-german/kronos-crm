'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { removeEmailBlocklistSchema } from './schema'

export const removeEmailBlocklist = orgActionClient
  .schema(removeEmailBlocklistSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem remover da lista de saída.')
    }

    const entry = await db.emailBlocklist.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!entry) {
      throw new Error('Registro não encontrado ou não pertence à organização.')
    }

    await db.emailBlocklist.delete({ where: { id: data.id } })

    revalidateTag(`email-blocklist:${ctx.orgId}`)

    return { success: true }
  })
