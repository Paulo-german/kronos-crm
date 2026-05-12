import { db } from '@/_lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recalcula o valor total de um deal com base nos seus itens (line items + legacy products).
 * Fórmula por item: (unitPrice * quantity) - desconto
 * - Se discountType = 'percentage': desconto = (unitPrice * quantity) * (discountValue / 100)
 * - Se discountType = 'fixed': desconto = discountValue
 *
 * Fase 1: soma DealLineItem (novo) + DealProduct (legacy) para retrocompatibilidade.
 * Fase 3: remover DealProduct após backfill.
 */
export async function recalculateDealValue(dealId: string): Promise<void> {
  const [lineItems, legacyProducts] = await Promise.all([
    db.dealLineItem.findMany({
      where: { dealId },
      select: {
        unitPrice: true,
        quantity: true,
        discountType: true,
        discountValue: true,
      },
    }),
    // Manter até Fase 3 (backfill + drop DealProduct)
    db.dealProduct.findMany({
      where: { dealId },
      select: {
        unitPrice: true,
        quantity: true,
        discountType: true,
        discountValue: true,
      },
    }),
  ])

  let total = new Decimal(0)

  for (const item of [...lineItems, ...legacyProducts]) {
    const subtotal = new Decimal(item.unitPrice).mul(item.quantity)
    const discount =
      item.discountType === 'percentage'
        ? subtotal.mul(new Decimal(item.discountValue).div(100))
        : new Decimal(item.discountValue)

    total = total.add(subtotal.sub(discount))
  }

  await db.deal.update({
    where: { id: dealId },
    data: { value: total },
  })
}
