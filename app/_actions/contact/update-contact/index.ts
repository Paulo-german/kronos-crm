'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const updateContact = authActionClient
  .schema(updateContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica se o contato existe e pertence ao usuário
    const existingContact = await db.contact.findFirst({
      where: {
        id: data.id,
        ownerId: ctx.userId,
      },
    })

    if (!existingContact) {
      throw new Error('Contato não encontrado ou sem permissão.')
    }

    // Se mudou a empresa, verifica se a nova pertence ao usuário
    if (data.companyId && data.companyId !== existingContact.companyId) {
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

    await db.contact.update({
      where: { id: data.id },
      data: {
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
    revalidatePath(`/contacts/${data.id}`)

    return { success: true }
  })
