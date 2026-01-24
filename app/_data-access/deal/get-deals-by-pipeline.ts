import 'server-only'
import { db } from '@/_lib/prisma'
// Importe os tipos gerados pelo Prisma para evitar erros de tipagem
import { DealStatus, DealPriority } from '@prisma/client'

export interface DealDto {
  id: string
  title: string
  stageId: string
  status: DealStatus
  priority: DealPriority
  contactId: string | null
  contactName: string | null
  companyId: string | null
  companyName: string | null
  expectedCloseDate: Date | null
  totalValue: number
  notes: string | null
  createdAt: Date
}

export interface DealsByStageDto {
  [stageId: string]: DealDto[]
}

export const getDealsByPipeline = async (
  stageIds: string[],
): Promise<DealsByStageDto> => {
  if (stageIds.length === 0) return {}

  // 1. Inicializa estrutura de retorno
  const result: DealsByStageDto = stageIds.reduce((acc, stageId) => {
    acc[stageId] = []
    return acc
  }, {} as DealsByStageDto)

  // 2. CORREÇÃO PRINCIPAL: Buscamos na tabela 'deal', não 'dealContact'
  const deals = await db.deal.findMany({
    where: {
      pipelineStageId: {
        in: stageIds,
      },
    },
    include: {
      // Busca a relação N:N (DealContact)
      contacts: {
        // Tenta pegar o contato marcado como primário, ou o primeiro que encontrar
        orderBy: {
          isPrimary: 'desc',
        },
        take: 1,
        include: {
          contact: {
            select: { name: true }, // Traz apenas o nome do contato final
          },
        },
      },
      company: {
        select: { name: true },
      },
      dealProducts: {
        select: {
          unitPrice: true,
          quantity: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // 3. Mapeamento dos dados
  for (const deal of deals) {
    // Cálculo do valor total (mantido da sua lógica)
    const totalValue = deal.dealProducts.reduce((sum, dp) => {
      const subtotal = Number(dp.unitPrice) * dp.quantity
      let discount = 0

      if (dp.discountValue) {
        discount =
          dp.discountType === 'percentage'
            ? subtotal * (Number(dp.discountValue) / 100)
            : Number(dp.discountValue)
      }

      return sum + (subtotal - discount)
    }, 0)

    // Acessa o primeiro contato da lista (agora seguro)
    // deal.contacts é um array de DealContact. O contato real está dentro de .contact
    const primaryLink = deal.contacts[0]
    const contactName = primaryLink?.contact?.name ?? null
    const contactId = primaryLink?.contactId ?? null

    // Garante que o stage existe no result antes de dar push
    if (result[deal.pipelineStageId]) {
      result[deal.pipelineStageId].push({
        id: deal.id,
        title: deal.title,
        stageId: deal.pipelineStageId,
        status: deal.status,
        priority: deal.priority, // O Prisma já tipa isso corretamente agora
        contactId,
        contactName,
        companyId: deal.companyId,
        companyName: deal.company?.name ?? null,
        expectedCloseDate: deal.expectedCloseDate,
        totalValue,
        notes: deal.notes,
        createdAt: deal.createdAt,
      })
    }
  }

  return result
}
