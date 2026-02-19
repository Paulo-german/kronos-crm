/**
 * One-time script to backfill deal.value from dealProducts.
 * Run with: npx tsx prisma/scripts/backfill-deal-values.ts
 */

import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  const deals = await prisma.deal.findMany({
    select: {
      id: true,
      dealProducts: {
        select: {
          unitPrice: true,
          quantity: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  })

  console.log(`Found ${deals.length} deals to process.`)
  let updated = 0

  for (const deal of deals) {
    let total = new Decimal(0)

    for (const p of deal.dealProducts) {
      const subtotal = new Decimal(p.unitPrice).mul(p.quantity)
      const discount =
        p.discountType === 'percentage'
          ? subtotal.mul(new Decimal(p.discountValue).div(100))
          : new Decimal(p.discountValue)

      total = total.add(subtotal.sub(discount))
    }

    if (!total.eq(0)) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: { value: total },
      })
      updated++
    }
  }

  console.log(`Updated ${updated} deals with calculated values.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
