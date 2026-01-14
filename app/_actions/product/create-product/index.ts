'use server'

import { authActionClient } from '@/_lib/safe-action'
import { productSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const createProduct = authActionClient
  .schema(productSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const product = await db.product.create({
      data: {
        ownerId: ctx.userId,
        name: data.name,
        description: data.description || null,
        price: data.price,
      },
    })

    revalidatePath('/products')

    return { success: true, productId: product.id }
  })
