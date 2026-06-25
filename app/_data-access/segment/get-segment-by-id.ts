import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import type { SegmentDto } from './get-segments'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'

/**
 * Detalhe de uma segmentação por id, validando a organização.
 * Retorna null se não existir ou não pertencer à org.
 */
export const getSegmentById = cache(
  async (ctx: RBACContext, segmentId: string): Promise<SegmentDto | null> => {
    const segment = await db.contactSegment.findFirst({
      where: { id: segmentId, organizationId: ctx.orgId },
      include: { creator: { select: { fullName: true } } },
    })

    if (!segment) {
      return null
    }

    return {
      id: segment.id,
      name: segment.name,
      description: segment.description,
      filters: segment.filters as unknown as ContactFilters,
      createdBy: segment.createdBy,
      createdByName: segment.creator.fullName,
      createdAt: segment.createdAt,
      updatedAt: segment.updatedAt,
    }
  },
)
