import 'server-only'
import { db } from '@/_lib/prisma'
import { unstable_cache } from 'next/cache'

export type DealLostReasonDto = {
  id: string
  name: string
  isActive: boolean
}

/**
 * Busca motivos de perda de uma organização
 */
export const getDealLostReasons = async (organizationId: string) => {
  return unstable_cache(
    async () => {
      return db.dealLostReason.findMany({
        where: {
          organizationId,
          isActive: true, // Por padrão, traz apenas os ativos
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      })
    },
    [`deal-lost-reasons-${organizationId}`],
    {
      tags: [`deal-lost-reasons:${organizationId}`],
      revalidate: 3600,
    },
  )()
}

/**
 * Busca TODOS os motivos de perda (ativos e inativos) para a tela de configurações
 */
export const getAllDealLostReasons = async (organizationId: string) => {
  return unstable_cache(
    async () => {
      return db.dealLostReason.findMany({
        where: {
          organizationId,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: { deals: true },
          },
        },
      })
    },
    [`all-deal-lost-reasons-${organizationId}`],
    {
      tags: [`deal-lost-reasons:${organizationId}`],
      revalidate: 3600,
    },
  )()
}
