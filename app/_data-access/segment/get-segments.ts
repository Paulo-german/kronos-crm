import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'

export interface SegmentDto {
  id: string
  name: string
  description: string | null
  filters: ContactFilters
  createdBy: string
  createdByName: string | null
  createdAt: Date
  updatedAt: Date
}

const fetchSegmentsFromDb = async (orgId: string): Promise<SegmentDto[]> => {
  const segments = await db.contactSegment.findMany({
    where: { organizationId: orgId },
    include: { creator: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    // filters é Json no DB; o shape é garantido na escrita (Zod do create/update)
    filters: segment.filters as unknown as ContactFilters,
    createdBy: segment.createdBy,
    createdByName: segment.creator.fullName,
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
  }))
}

/**
 * Lista as segmentações da organização (Cacheado).
 * Segmento é transversal e dinâmico — gerência só OWNER/ADMIN, mas a leitura
 * não filtra por dono (o conjunto resolvido depois respeita o RBAC do contato).
 */
export const getSegments = async (ctx: RBACContext): Promise<SegmentDto[]> => {
  const getCached = unstable_cache(
    async () => fetchSegmentsFromDb(ctx.orgId),
    [`segments-${ctx.orgId}`],
    {
      tags: [`segments:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
