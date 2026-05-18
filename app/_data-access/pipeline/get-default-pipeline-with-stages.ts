import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface PipelineStageSimple {
  id: string
  name: string
}

const fetchFromDb = async (orgId: string): Promise<PipelineStageSimple[]> => {
  const pipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: {
      stages: {
        select: { id: true, name: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  return pipeline?.stages ?? []
}

export const getDefaultPipelineWithStages = cache(async (
  orgId: string,
): Promise<PipelineStageSimple[]> => {
  const getCached = unstable_cache(
    async () => fetchFromDb(orgId),
    [`default-pipeline-stages-${orgId}`],
    { tags: [`pipeline:${orgId}`], revalidate: 3600 },
  )

  return getCached()
})
