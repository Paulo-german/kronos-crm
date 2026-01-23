'use server'

import { authActionClient } from '@/_lib/safe-action'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { z } from 'zod'

// Schema simples, sem input
const schema = z.object({})

export const getDealsOptionsAction = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const deals = await getDealsOptions(ctx.userId)
    return deals
  })
