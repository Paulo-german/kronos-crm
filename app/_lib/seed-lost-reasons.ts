import 'server-only'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

/**
 * Seed inicial dos motivos de perda para uma organização
 */
export const seedDealLostReasons = async (organizationId: string) => {
  const defaultReasons = [
    'Preço Alto',
    'Sem Fit Técnico',
    'Concorrência',
    'Projeto Pausado',
    'Declinou sem Motivo',
    'Fora do ICP',
  ]

  // Verifica se já existem motivos cadastrados
  const count = await db.dealLostReason.count({
    where: { organizationId },
  })

  // Só cria se não houver nenhum
  if (count === 0) {
    await db.dealLostReason.createMany({
      data: defaultReasons.map((name) => ({
        name,
        organizationId,
      })),
    })

    revalidateTag(`deal-lost-reasons:${organizationId}`)
  }
}
