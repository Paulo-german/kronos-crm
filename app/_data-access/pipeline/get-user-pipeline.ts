import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
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
  isDefault: boolean
  showIdleDays: boolean
  stages: StageDto[]
}

const fetchOrgPipelineFromDb = async (
  orgId: string,
  pipelineId?: string,
): Promise<PipelineWithStagesDto | null> => {
  const stagesInclude = {
    orderBy: { position: 'asc' as const },
    include: {
      _count: { select: { deals: true } },
    },
  }

  // Busca por ID específico quando fornecido pelo seletor de pipeline
  if (pipelineId) {
    const pipeline = await db.pipeline.findFirst({
      where: { id: pipelineId, organizationId: orgId },
      include: { stages: stagesInclude },
    })

    if (!pipeline) return null

    return {
      id: pipeline.id,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      showIdleDays: pipeline.showIdleDays,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        dealCount: stage._count.deals,
      })),
    }
  }

  // Tenta o pipeline marcado como default
  const defaultPipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId, isDefault: true },
    include: { stages: stagesInclude },
  })

  if (defaultPipeline) {
    return {
      id: defaultPipeline.id,
      name: defaultPipeline.name,
      isDefault: defaultPipeline.isDefault,
      showIdleDays: defaultPipeline.showIdleDays,
      stages: defaultPipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        dealCount: stage._count.deals,
      })),
    }
  }

  // Fallback: pipeline mais antigo (cobre orgs migradas sem isDefault marcado)
  const oldestPipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    include: { stages: stagesInclude },
    orderBy: { createdAt: 'asc' },
  })

  if (!oldestPipeline) return null

  return {
    id: oldestPipeline.id,
    name: oldestPipeline.name,
    isDefault: oldestPipeline.isDefault,
    showIdleDays: oldestPipeline.showIdleDays,
    stages: oldestPipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
      dealCount: stage._count.deals,
    })),
  }
}

/**
 * Busca um pipeline da organização com todas as etapas (Cacheado).
 * Quando pipelineId é omitido, retorna o pipeline marcado como default.
 * Fallback: pipeline mais antigo (garante backward compatibility).
 */
export const getOrgPipeline = cache(
  async (orgId: string, pipelineId?: string): Promise<PipelineWithStagesDto | null> => {
    const getCachedPipeline = unstable_cache(
      async () => fetchOrgPipelineFromDb(orgId, pipelineId),
      [`org-pipeline-${orgId}-${pipelineId ?? 'default'}`],
      { tags: [`pipeline:${orgId}`] },
    )

    return getCachedPipeline()
  },
)

// Alias para backward compatibility com código existente que usa getUserPipeline
export const getUserPipeline = getOrgPipeline
