import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const fetchDefaultPipelineIdFromDb = async (orgId: string): Promise<string | null> => {
  // Tenta o pipeline marcado como default
  const defaultPipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId, isDefault: true },
    select: { id: true },
  })

  if (defaultPipeline) return defaultPipeline.id

  // Fallback: pipeline mais antigo (cobre orgs migradas sem isDefault marcado)
  const oldest = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  return oldest?.id ?? null
}

/**
 * Retorna o ID do pipeline default da organização.
 * Útil como fallback quando o usuário não selecionou nenhum pipeline na URL.
 */
export const getDefaultPipelineId = cache(async (orgId: string): Promise<string | null> => {
  const getCached = unstable_cache(
    async () => fetchDefaultPipelineIdFromDb(orgId),
    [`default-pipeline-id-${orgId}`],
    { tags: [`pipeline:${orgId}`] },
  )

  return getCached()
})
