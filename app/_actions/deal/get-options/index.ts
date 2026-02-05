'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { z } from 'zod'

const schema = z.object({})

export const getDealsOptionsAction = orgActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    // Passa o contexto RBAC completo para a função de data access
    const deals = await getDealsOptions({
      orgId: ctx.orgId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    })
    return deals
  })
