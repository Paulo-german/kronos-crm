'use server'

import { authActionClient } from '@/_lib/safe-action'
import { addDealContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

export const addDealContact = authActionClient
  .schema(addDealContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica permissão (deal pertence a pipeline do user?)
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

    // Se for definir como primary, remove status dos outros
    if (data.isPrimary) {
      await db.dealContact.updateMany({
        where: { dealId: data.dealId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    await db.dealContact.create({
      data: {
        dealId: data.dealId,
        contactId: data.contactId,
        role: data.role,
        isPrimary: data.isPrimary,
      },
    })

    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })
