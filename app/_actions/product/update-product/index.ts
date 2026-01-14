'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const updateProduct = authActionClient
  .schema(updateProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica se o produto existe e pertence ao usuário
    const existingProduct = await db.product.findFirst({
      where: {
        id: data.id,
        ownerId: ctx.userId,
      },
    })

    if (!existingProduct) {
      throw new Error('Produto não encontrado ou sem permissão.')
    }

    await db.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
      },
    })

    revalidatePath('/products')
    revalidatePath(`/products/${data.id}`)

    return { success: true }
  })
