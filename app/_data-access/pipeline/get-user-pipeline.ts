import 'server-only'
import { db } from '@/_lib/prisma'

export interface StageDto {
  id: string
  name: string
  color: string | null
  position: number
  dealCount: number
}

export interface PipelineWithStagesDto {
  id: string
  name: string
  wonStageId: string | null
  lostStageId: string | null
  stages: StageDto[]
}

/**
 * Busca o pipeline do usuário com todas as etapas
 * Inclui contagem de deals por etapa
 */
export const getUserPipeline = async (
  userId: string,
): Promise<PipelineWithStagesDto | null> => {
  const pipeline = await db.pipeline.findFirst({
    where: {
      createdBy: userId,
    },
    include: {
      stages: {
        orderBy: {
          position: 'asc',
        },
        include: {
          _count: {
            select: { deals: true },
          },
        },
      },
    },
  })

  if (!pipeline) return null

  return {
    id: pipeline.id,
    name: pipeline.name,
    wonStageId: pipeline.wonStageId,
    lostStageId: pipeline.lostStageId,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
      dealCount: stage._count.deals,
    })),
  }
}
