import { db } from '@/_lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recalcula o valor total de um deal com base nos seus itens (line items).
 * Fórmula por item: (unitPrice * quantity) - desconto
 * - Se discountType = 'percentage': desconto = (unitPrice * quantity) * (discountValue / 100)
 * - Se discountType = 'fixed': desconto = discountValue
 */
export async function recalculateDealValue(dealId: string): Promise<void> {
  const lineItems = await db.dealLineItem.findMany({
    where: { dealId },
    select: {
      unitPrice: true,
      quantity: true,
      discountType: true,
      discountValue: true,
    },
  })

  let total = new Decimal(0)

  for (const item of lineItems) {
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
