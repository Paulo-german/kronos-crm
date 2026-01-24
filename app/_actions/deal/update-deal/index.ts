'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

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
    const contact = data.contactId
      ? await db.contact.findFirst({
          where: {
            id: data.contactId,
            ownerId: ctx.userId,
          },
        })
      : null

    // Valida contato se informado
    if (data.contactId && !contact) {
      throw new Error('Contato não encontrado ou não pertence a você.')
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

    // Handle Contact Update (N:N Migration)
    if (typeof data.contactId !== 'undefined') {
      // 1. Unmark current primaries
      await db.dealContact.updateMany({
        where: { dealId: data.id, isPrimary: true },
        data: { isPrimary: false },
      })

      // 2. If new contact provided, set as primary
      if (data.contactId) {
        await db.dealContact.upsert({
          where: {
            dealId_contactId: {
              dealId: data.id,
              contactId: data.contactId,
            },
          },
          create: {
            dealId: data.id,
            contactId: data.contactId,
            isPrimary: true,
            role: contact?.role,
          },
          update: {
            isPrimary: true,
          },
        })
      }
    }

    await db.deal.update({
      where: { id: data.id },
      data: {
        title: data.title,
        priority: data.priority,
        notes: data.notes,
        companyId: data.companyId,
        expectedCloseDate: data.expectedCloseDate,
      },
    })

    revalidatePath('/pipeline')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true }
  })
