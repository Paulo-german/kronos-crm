'use server'

import { authActionClient } from '@/_lib/safe-action'
import { removeDealProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const removeDealProduct = authActionClient
  .schema(removeDealProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Busca o DealProduct com validação de ownership
    const dealProduct = await db.dealProduct.findFirst({
      where: {
        id: data.dealProductId,
        deal: {
          stage: {
            pipeline: {
              createdBy: ctx.userId,
            },
          },
        },
      },
      include: {
        product: true,
        deal: true,
      },
    })

    if (!dealProduct) {
      throw new Error('Produto não encontrado ou não pertence a você.')
    }

    // Remove
    await db.dealProduct.delete({
      where: { id: data.dealProductId },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: 'product_removed',
        content: dealProduct.product.name,
        dealId: dealProduct.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${dealProduct.dealId}`)

    return { success: true }
  })
