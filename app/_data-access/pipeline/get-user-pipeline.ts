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
  stages: StageDto[]
}

const fetchOrgPipelineFromDb = async (orgId: string) => {
  const pipeline = await db.pipeline.findFirst({
    where: {
      organizationId: orgId,
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
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
      dealCount: stage._count.deals,
    })),
  }
}

/**
 * Busca o pipeline da organização com todas as etapas (Cacheado)
 * Usa Request Memoization (React) + Data Cache (Next.js)
 */
export const getOrgPipeline = cache(async (orgId: string) => {
  const getCachedPipeline = unstable_cache(
    async () => fetchOrgPipelineFromDb(orgId),
    [`org-pipeline-${orgId}`],
    {
      tags: [`pipeline:${orgId}`],
    },
  )

  return getCachedPipeline()
})

// Alias para backward compatibility durante migração
export const getUserPipeline = getOrgPipeline
