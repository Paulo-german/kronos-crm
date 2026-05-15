import { db } from '@/_lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recalcula o valor total (`value`) e a receita mensal recorrente (`mrr`) de um deal.
 *
 * - `value`: soma de todos os itens (ONE_TIME + RECURRING) após desconto
 * - `mrr`: soma apenas dos itens recorrentes, normalizados para base mensal
 *   - billingCycle = MONTHLY → valor do item (já mensal)
 *   - billingCycle = ANNUAL  → valor do item ÷ 12
 *
 * Fórmula por item: (unitPrice * quantity) - desconto
 *   - discountType = 'percentage' → desconto = subtotal * (discountValue / 100)
 *   - discountType = 'fixed'      → desconto = discountValue
 */
export async function recalculateDealValue(dealId: string): Promise<void> {
  const lineItems = await db.dealLineItem.findMany({
    where: { dealId },
    select: {
      unitPrice: true,
      quantity: true,
      discountType: true,
      discountValue: true,
      recurrenceType: true,
      billingCycle: true,
    },
  })

  let value = new Decimal(0)
  let mrr = new Decimal(0)

  for (const item of lineItems) {
    const subtotal = new Decimal(item.unitPrice).mul(item.quantity)
    const discount =
      item.discountType === 'percentage'
        ? subtotal.mul(new Decimal(item.discountValue).div(100))
        : new Decimal(item.discountValue)
    const net = subtotal.sub(discount)

    value = value.add(net)

    if (item.recurrenceType !== 'ONE_TIME') {
      const monthly = item.billingCycle === 'ANNUAL' ? net.div(12) : net
      mrr = mrr.add(monthly)
    }
  }

  await db.deal.update({
    where: { id: dealId },
    data: { value, mrr },
  })
}
