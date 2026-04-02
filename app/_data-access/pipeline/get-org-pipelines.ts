import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface OrgPipelineDto {
  id: string
  name: string
  isDefault: boolean
  showIdleDays: boolean
  stageCount: number
  dealCount: number
  createdAt: Date
}

const fetchOrgPipelinesFromDb = async (orgId: string): Promise<OrgPipelineDto[]> => {
  const pipelines = await db.pipeline.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      isDefault: true,
      showIdleDays: true,
      createdAt: true,
      _count: { select: { stages: true } },
      stages: {
        select: {
          _count: { select: { deals: true } },
        },
      },
    },
    // Pipeline default sempre primeiro, depois por ordem de criação
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  return pipelines.map((pipeline) => ({
    id: pipeline.id,
    name: pipeline.name,
    isDefault: pipeline.isDefault,
    showIdleDays: pipeline.showIdleDays,
    createdAt: pipeline.createdAt,
    stageCount: pipeline._count.stages,
    dealCount: pipeline.stages.reduce((sum, stage) => sum + stage._count.deals, 0),
  }))
}

export const getOrgPipelines = async (orgId: string): Promise<OrgPipelineDto[]> => {
  const getCached = unstable_cache(
    async () => fetchOrgPipelinesFromDb(orgId),
    [`org-pipelines-${orgId}`],
    { tags: [`pipeline:${orgId}`] },
  )

  return getCached()
}
