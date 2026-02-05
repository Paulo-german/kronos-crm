'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { globalSearchSchema } from './schema'
import { globalSearch } from '@/_data-access/search/global-search'

export const globalSearchAction = orgActionClient
  .schema(globalSearchSchema)
  .action(async ({ parsedInput: { query }, ctx }) => {
    // Passa o contexto RBAC completo para aplicar filtros de visibilidade
    const results = await globalSearch(ctx, query)
    return results
  })
