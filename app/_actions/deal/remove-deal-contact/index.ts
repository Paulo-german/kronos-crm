'use server'

import { authActionClient } from '@/_lib/safe-action'
import { removeDealContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

export const removeDealContact = authActionClient
  .schema(removeDealContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Permissões
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        stage: {
          pipeline: {
            createdBy: ctx.userId,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal não encontrado ou acesso negado.')
    }

    await db.dealContact.delete({
      where: {
        dealId_contactId: {
          dealId: data.dealId,
          contactId: data.contactId,
        },
      },
    })

    // Se removeu o primary, talvez fosse bom eleger outro, mas por enquanto deixa sem.

    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })
