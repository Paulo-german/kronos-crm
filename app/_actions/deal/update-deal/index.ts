'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const updateDeal = authActionClient
  .schema(updateDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do deal (via stage -> pipeline)
    const deal = await db.deal.findFirst({
      where: {
        id: data.id,
        stage: {
          pipeline: {
            createdBy: ctx.userId,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal não encontrado ou não pertence a você.')
    }

    // Valida contato se informado
    if (data.contactId) {
      const contact = await db.contact.findFirst({
        where: {
          id: data.contactId,
          ownerId: ctx.userId,
        },
      })
      if (!contact) {
        throw new Error('Contato não encontrado ou não pertence a você.')
      }
    }

    // Valida empresa se informada
    if (data.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          ownerId: ctx.userId,
        },
      })
      if (!company) {
        throw new Error('Empresa não encontrada ou não pertence a você.')
      }
    }

    await db.deal.update({
      where: { id: data.id },
      data: {
        title: data.title,
        priority: data.priority,
        notes: data.notes,
        contactId: data.contactId,
        companyId: data.companyId,
        expectedCloseDate: data.expectedCloseDate,
      },
    })

    revalidatePath('/pipeline')

    return { success: true }
  })
