import 'server-only'

import { db } from '@/_lib/prisma'

export type DealOptionDto = {
  id: string
  title: string
  contactName: string | null
}

export const getDealsOptions = async (
  userId: string,
): Promise<DealOptionDto[]> => {
  const deals = await db.deal.findMany({
    where: {
      OR: [{ assignedTo: userId }, { company: { ownerId: userId } }],
      status: {
        in: ['OPEN', 'IN_PROGRESS'], // Apenas deals ativos
      },
    },
    select: {
      id: true,
      title: true,
      contact: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 50, // Limite para não explodir o combobox
  })

  return deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    contactName: deal.contact?.name ?? null,
  }))
}
