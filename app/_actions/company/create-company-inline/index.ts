'use server'

import { z } from 'zod'
import { authActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export const createCompanyInline = authActionClient
  .schema(createCompanySchema)
  .action(async ({ parsedInput: { name }, ctx }) => {
    const company = await db.company.create({
      data: {
        name,
        ownerId: ctx.userId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    return company
  })
