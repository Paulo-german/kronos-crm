import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import type { DealLineItemDto } from './get-deal-details'

export interface DealLineItemsResult {
  lineItems: DealLineItemDto[]
  totalValue: number
}

const fetchDealLineItemsFromDb = async (
  dealId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<DealLineItemsResult> => {
  const items = await db.dealLineItem.findMany({
    where: {
      dealId,
      // RBAC pelo dono do deal — MEMBER só acessa os próprios.
      deal: {
        organizationId: orgId,
        ...(elevated ? {} : { assignedTo: userId }),
      },
    },
    include: {
      product: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, duration: true } },
      promotion: { select: { id: true, name: true } },
    },
  })

  const lineItems: DealLineItemDto[] = items.map((item) => {
    const gross = Number(item.unitPrice) * item.quantity
    const discount =
      item.discountType === 'percentage'
        ? gross * (Number(item.discountValue) / 100)
        : Number(item.discountValue)

    return {
      id: item.id,
      itemType: item.itemType,
      product: item.product ?? undefined,
      service: item.service ?? undefined,
      promotion: item.promotion ?? undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discountType: item.discountType as 'percentage' | 'fixed',
      discountValue: Number(item.discountValue),
      subtotal: gross - discount,
    }
  })

  const totalValue = lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  return { lineItems, totalValue }
}

/**
 * Itens (produtos/serviços/promoções) de um deal, com nomes resolvidos e total.
 * Carregado sob demanda pela aba Produtos — fora da query base de getDealDetails.
 */
export const getDealLineItems = cache(
  async (dealId: string, ctx: RBACContext): Promise<DealLineItemsResult> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchDealLineItemsFromDb(dealId, ctx.orgId, ctx.userId, elevated),
      [`deal-line-items-${dealId}-${ctx.userId}-${elevated}`],
      {
        tags: [`deal:${dealId}`, `deals:${ctx.orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
