'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getSegmentPreview } from '@/_data-access/segment/get-segment-preview'
import { contactFiltersSchema } from '../schema'

/**
 * Preview ao vivo dos filtros informados: contagem total de contatos elegíveis
 * + uma amostra. Usado no painel de resultado do dialog de segmentação.
 */
export const previewSegmentCount = orgActionClient
  .schema(contactFiltersSchema)
  .action(async ({ parsedInput: filters, ctx }) => {
    requirePermission(canPerformAction(ctx, 'segment', 'read'))

    return getSegmentPreview(ctx, filters)
  })
