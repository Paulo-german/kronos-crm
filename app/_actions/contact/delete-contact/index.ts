'use server'

import { z } from 'zod'
import { authActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

const deleteContactSchema = z.object({
  id: z.string().uuid(),
})

export const deleteContact = authActionClient
  .schema(deleteContactSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // Verifica se o contato existe e pertence ao usuário
    const contact = await db.contact.findFirst({
      where: {
        id,
        ownerId: ctx.userId,
      },
    })

    if (!contact) {
      throw new Error('Contato não encontrado ou sem permissão.')
    }

    await db.contact.delete({
      where: { id },
    })

    revalidatePath('/contacts')

    return { success: true }
  })
