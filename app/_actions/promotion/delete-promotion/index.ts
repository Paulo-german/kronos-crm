'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deletePromotionSchema } from './schema'

export const deletePromotion = orgActionClient
  .schema(deletePromotionSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // 1. RBAC: apenas OWNER/ADMIN podem deletar promoções
    requirePermission(canPerformAction(ctx, 'promotion', 'delete'))

    // 2. Garantir que a promoção pertence à organização do caller
    const promotion = await db.promotion.findFirst({
      where: {
        id,
        organizationId: ctx.orgId,
      },
      select: { id: true },
    })

    if (!promotion) {
      throw new Error('Promoção não encontrada.')
    }

    // 3. Delete cascateia em PromotionItem via FK (onDelete: Cascade)
    await db.promotion.delete({
      where: { id },
    })

    // 4. Invalidar cache; deals podem referenciar a promoção em DealLineItem
    revalidateTag(`promotions:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidatePath('/org/[orgSlug]/crm/settings/catalog', 'page')

    return { success: true }
  })
