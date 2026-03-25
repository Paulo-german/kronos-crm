'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { globalSearchSchema } from './schema'
import { globalSearch } from '@/_data-access/search/global-search'
import type { GlobalSearchResult } from '@/_data-access/search/types'

export const globalSearchAction = orgActionClient
  .schema(globalSearchSchema)
  .action(async ({ parsedInput: { query }, ctx }): Promise<GlobalSearchResult> => {
    // orgSlug é resolvido internamente pelo data-access via getOrgSlug(ctx.orgId)
    return globalSearch(ctx, query)
  })
