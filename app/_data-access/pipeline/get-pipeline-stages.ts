import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface PipelineStageOption {
  pipelineId: string
  pipelineName: string
  stageId: string
  stageName: string
}

const fetchPipelineStagesFromDb = async (
  pipelineIds: string[],
): Promise<PipelineStageOption[]> => {
  if (pipelineIds.length === 0) return []

  const pipelines = await db.pipeline.findMany({
    where: { id: { in: pipelineIds } },
    select: {
      id: true,
      name: true,
      stages: {
        select: { id: true, name: true },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return pipelines.flatMap((pipeline) =>
    pipeline.stages.map((stage) => ({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stageId: stage.id,
      stageName: stage.name,
    })),
  )
}

export const getPipelineStages = async (
  pipelineIds: string[],
  orgId: string,
): Promise<PipelineStageOption[]> => {
  if (pipelineIds.length === 0) return []

  const sortedIds = [...pipelineIds].sort().join(',')

  const getCached = unstable_cache(
    async () => fetchPipelineStagesFromDb(pipelineIds),
    [`pipeline-stages-${sortedIds}`],
    { tags: [`pipeline:${orgId}`] },
  )

  return getCached()
}
