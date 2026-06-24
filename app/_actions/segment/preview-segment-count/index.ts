'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { countContactsForSegment } from '@/_data-access/segment/count-contacts-for-segment'
import { contactFiltersSchema } from '../schema'

/**
 * Conta ao vivo quantos contatos elegíveis casam com os filtros informados.
 * Usado no preview do dialog de segmentação ("X contatos atingidos").
 */
export const previewSegmentCount = orgActionClient
  .schema(contactFiltersSchema)
  .action(async ({ parsedInput: filters, ctx }) => {
    requirePermission(canPerformAction(ctx, 'segment', 'read'))

    const count = await countContactsForSegment(ctx, filters)

    return { count }
  })
