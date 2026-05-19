'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const updateCompanyInlineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
})

export const updateCompanyInline = orgActionClient
  .schema(updateCompanyInlineSchema)
  .action(async ({ parsedInput: { id, name }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'company', 'update'))

    const company = await db.company.update({
      where: {
        id,
        organizationId: ctx.orgId,
      },
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
      },
    })

    revalidateTag(`companies:${ctx.orgId}`)

    return company
  })
