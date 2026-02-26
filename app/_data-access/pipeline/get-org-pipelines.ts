import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface OrgPipelineDto {
  id: string
  name: string
}

const fetchOrgPipelinesFromDb = async (
  orgId: string,
): Promise<OrgPipelineDto[]> => {
  const pipelines = await db.pipeline.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return pipelines
}

export const getOrgPipelines = async (
  orgId: string,
): Promise<OrgPipelineDto[]> => {
  const getCached = unstable_cache(
    async () => fetchOrgPipelinesFromDb(orgId),
    [`org-pipelines-${orgId}`],
    { tags: [`pipeline:${orgId}`] },
  )

  return getCached()
}
