'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'

export const createDeal = authActionClient
  .schema(createDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership da stage (via pipeline)
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipeline: {
          createdBy: ctx.userId,
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada ou não pertence a você.')
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

    const deal = await db.deal.create({
      data: {
        title: data.title,
        pipelineStageId: data.stageId,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        expectedCloseDate: data.expectedCloseDate || null,
        assignedTo: ctx.userId,
      },
    })

    revalidatePath('/pipeline')
    revalidateTag(`pipeline:${ctx.userId}`)

    return { success: true, dealId: deal.id }
  })
