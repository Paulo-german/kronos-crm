'use server'

import { authActionClient } from '@/_lib/safe-action'
import { contactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const createContact = authActionClient
  .schema(contactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Se tem empresa, verifica se pertence ao usuário
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

    const contact = await db.contact.create({
      data: {
        ownerId: ctx.userId, // Owner direto
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || null,
        cpf: data.cpf || null,
        companyId: data.companyId || null,
        isDecisionMaker: data.isDecisionMaker,
      },
    })

    revalidatePath('/contacts')

    return { success: true, contactId: contact.id }
  })
