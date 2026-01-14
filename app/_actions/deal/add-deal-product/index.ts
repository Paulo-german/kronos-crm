'use server'

import { authActionClient } from '@/_lib/safe-action'
import { addDealProductSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const addDealProduct = authActionClient
  .schema(addDealProductSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do deal
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
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

    // Verifica ownership do produto
    const product = await db.product.findFirst({
      where: {
        id: data.productId,
        ownerId: ctx.userId,
      },
    })

    if (!product) {
      throw new Error('Produto não encontrado ou não pertence a você.')
    }

    // Cria o DealProduct
    const dealProduct = await db.dealProduct.create({
      data: {
        dealId: data.dealId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: 'product_added',
        content: `${product.name} (${data.quantity}x)`,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true, dealProductId: dealProduct.id }
  })
