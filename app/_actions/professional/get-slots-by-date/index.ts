'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { getSlotsByDateSchema } from './schema'
import { getSlotsByDate } from '@/_data-access/professional/get-slots-by-date'

export const getSlotsByDateAction = orgActionClient
  .schema(getSlotsByDateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    return await getSlotsByDate({
      orgId: ctx.orgId,
      serviceId: data.serviceId,
      date: data.date,
      professionalId: data.professionalId ?? undefined,
    })
  })
