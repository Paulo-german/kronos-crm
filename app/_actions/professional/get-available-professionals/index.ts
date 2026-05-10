'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { getAvailableProfessionals } from '@/_data-access/professional/get-available-professionals'
import { getAvailableProfessionalsSchema } from './schema'

export const getAvailableProfessionalsAction = orgActionClient
  .schema(getAvailableProfessionalsSchema)
  .action(async ({ parsedInput, ctx }) => {
    return getAvailableProfessionals({
      orgId: ctx.orgId,
      serviceId: parsedInput.serviceId,
      date: parsedInput.startDate,
      startTime: parsedInput.startTime,
      contactId: parsedInput.contactId,
    })
  })
