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

const fetchUserPipelineFromDb = async (userId: string) => {
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
 * Busca o pipeline do usuário com todas as etapas (Cacheado)
 * Usa Request Memoization (React) + Data Cache (Next.js)
 */
export const getUserPipeline = cache(async (userId: string) => {
  const getCachedPipeline = unstable_cache(
    async () => fetchUserPipelineFromDb(userId),
    [`user-pipeline-${userId}`],
    {
      tags: [`pipeline:${userId}`],
      revalidate: 3600, // Revalida a cada 1 hora se não houver invalidação manual
    },
  )

  return getCachedPipeline()
})
