import 'server-only'
import { db } from '@/_lib/prisma'
import type { DealPriority } from '@prisma/client'

export interface StaleDealDto {
  id: string
  title: string
  stageId: string
  assignedTo: string
  priority: DealPriority
  updatedAt: Date
}

export interface GetStaleDealsParams {
  orgId: string
  thresholdMinutes: number
  /** Opcional: restringe a busca a um pipeline específico */
  pipelineId?: string
  /** Opcional: restringe a busca a um estágio específico */
  stageId?: string
}

/**
 * Busca deals que não tiveram atividade nos últimos N minutos.
 * Sem cache — chamado pelo cron job do Trigger.dev em tempo real.
 *
 * Exclui deals PAUSED (deal pausado intencionalmente não deve ser considerado stale).
 * Verifica tanto a ausência de atividade recente quanto a última atualização do deal.
 */
export async function getStaleDeals(params: GetStaleDealsParams): Promise<StaleDealDto[]> {
  const { orgId, thresholdMinutes, pipelineId, stageId } = params
  const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000)

  const deals = await db.deal.findMany({
    where: {
      organizationId: orgId,
      // PAUSED é excluído: deal pausado intencionalmente não é stale
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      // Deal não foi atualizado recentemente
      updatedAt: { lt: thresholdDate },
      // Filtra por pipeline ou estágio quando especificado
      ...(stageId ? { pipelineStageId: stageId } : {}),
      ...(pipelineId
        ? { stage: { pipelineId } }
        : {}),
      // Nenhuma atividade recente vinculada ao deal
      activities: {
        none: {
          createdAt: { gt: thresholdDate },
        },
      },
    },
    select: {
      id: true,
      title: true,
      pipelineStageId: true,
      assignedTo: true,
      priority: true,
      updatedAt: true,
    },
  })

  return deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    stageId: deal.pipelineStageId,
    assignedTo: deal.assignedTo,
    priority: deal.priority,
    updatedAt: deal.updatedAt,
  }))
}
