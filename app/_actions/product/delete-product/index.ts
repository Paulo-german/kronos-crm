'use server'

import { z } from 'zod'
import { authActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

const deleteProductSchema = z.object({
  id: z.string().uuid(),
})

export const deleteProduct = authActionClient
  .schema(deleteProductSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // Verifica se o produto existe e pertence ao usuário
    const product = await db.product.findFirst({
      where: {
        id,
        ownerId: ctx.userId,
      },
    })

    if (!product) {
      throw new Error('Produto não encontrado ou sem permissão.')
    }

    await db.product.delete({
      where: { id },
    })

    revalidatePath('/products')

    return { success: true }
  })
