'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { createPromotionSchema } from './schema'

export const createPromotion = orgActionClient
  .schema(createPromotionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER/ADMIN podem criar promoções
    requirePermission(canPerformAction(ctx, 'promotion', 'create'))

    // 2. Criar Promotion + PromotionItem[] em uma transação para garantir atomicidade
    const promotion = await db.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          organizationId: ctx.orgId,
          name: data.name,
          description: data.description ?? null,
          price: data.price,
          discountType: data.discountType,
          discountValue: data.discountValue,
          isActive: data.isActive,
        },
      })

      if (data.items.length > 0) {
        await tx.promotionItem.createMany({
          data: data.items.map((item) => ({
            promotionId: created.id,
            productId: item.productId ?? null,
            serviceId: item.serviceId ?? null,
            quantity: item.quantity,
          })),
        })
      }

      return created
    })

    // 3. Invalidar cache da listagem de promoções da org
    revalidateTag(`promotions:${ctx.orgId}`)
    revalidatePath('/org/[orgSlug]/settings/catalog', 'page')

    return { success: true, promotionId: promotion.id }
  })
