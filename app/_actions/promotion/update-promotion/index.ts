'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updatePromotionSchema } from './schema'

export const updatePromotion = orgActionClient
  .schema(updatePromotionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER/ADMIN podem editar promoções
    requirePermission(canPerformAction(ctx, 'promotion', 'update'))

    // 2. Garantir que a promoção pertence à organização do caller
    const existing = await db.promotion.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
      select: { id: true },
    })

    if (!existing) {
      throw new Error('Promoção não encontrada.')
    }

    // 3. Atualizar promoção e reescrever os items em uma única transação.
    //    Estratégia delete+create simplifica o diff (sem necessidade de upsert por id);
    //    PromotionItem é uma tabela pivot leve, sem FKs apontando para si.
    await db.$transaction(async (tx) => {
      await tx.promotion.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description ?? null,
          price: data.price,
          isActive: data.isActive,
        },
      })

      await tx.promotionItem.deleteMany({
        where: { promotionId: data.id },
      })

      if (data.items.length > 0) {
        await tx.promotionItem.createMany({
          data: data.items.map((item) => ({
            promotionId: data.id,
            productId: item.productId ?? null,
            serviceId: item.serviceId ?? null,
            quantity: item.quantity,
          })),
        })
      }
    })

    // 4. Invalidar cache da listagem de promoções da org
    revalidateTag(`promotions:${ctx.orgId}`)
    revalidatePath('/org/[orgSlug]/settings/catalog', 'page')

    return { success: true }
  })
