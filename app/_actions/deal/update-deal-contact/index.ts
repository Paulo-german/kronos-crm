'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateDealContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

export const updateDealContact = authActionClient
  .schema(updateDealContactSchema)
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

    // Se mudar primary para true, reseta outros
    if (data.isPrimary) {
      await db.dealContact.updateMany({
        where: { dealId: data.dealId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    await db.dealContact.update({
      where: {
        dealId_contactId: {
          dealId: data.dealId,
          contactId: data.contactId,
        },
      },
      data: {
        role: data.role,
        isPrimary: data.isPrimary,
      },
    })

    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })
