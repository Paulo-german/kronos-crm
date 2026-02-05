'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export const createCompanyInline = orgActionClient
  .schema(createCompanySchema)
  .action(async ({ parsedInput: { name }, ctx }) => {
    // Verificar permissão (apenas ADMIN/OWNER podem criar empresas)
    requirePermission(canPerformAction(ctx, 'company', 'create'))

    const company = await db.company.create({
      data: {
        name,
        organizationId: ctx.orgId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    revalidateTag(`companies:${ctx.orgId}`)

    return company
  })
