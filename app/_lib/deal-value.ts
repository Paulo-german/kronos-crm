import { db } from '@/_lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recalcula o valor total de um deal com base nos seus produtos.
 * Fórmula por produto: (unitPrice * quantity) - desconto
 * - Se discountType = 'percentage': desconto = (unitPrice * quantity) * (discountValue / 100)
 * - Se discountType = 'fixed': desconto = discountValue
 */
export async function recalculateDealValue(dealId: string): Promise<void> {
  const products = await db.dealProduct.findMany({
    where: { dealId },
    select: {
      unitPrice: true,
      quantity: true,
      discountType: true,
      discountValue: true,
    },
  })

  let total = new Decimal(0)

  for (const p of products) {
    const subtotal = new Decimal(p.unitPrice).mul(p.quantity)
    const discount =
      p.discountType === 'percentage'
        ? subtotal.mul(new Decimal(p.discountValue).div(100))
        : new Decimal(p.discountValue)

    total = total.add(subtotal.sub(discount))
  }

  await db.deal.update({
    where: { id: dealId },
    data: { value: total },
  })
}
