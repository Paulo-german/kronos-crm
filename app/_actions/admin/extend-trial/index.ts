'use server'

import { addDays } from 'date-fns'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { extendTrialSchema } from './schema'

export const extendTrial = superAdminActionClient
  .schema(extendTrialSchema)
  .action(async ({ parsedInput: { organizationId, days } }) => {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { trialEndsAt: true },
    })

    if (!org) {
      throw new Error('Organização não encontrada.')
    }

    // Se já tem trial e ainda não expirou, estende a partir da data atual de expiração
    // Se não tem trial ou já expirou, estende a partir de agora
    const baseDate =
      org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date()

    const newTrialEndsAt = addDays(baseDate, days)

    await db.organization.update({
      where: { id: organizationId },
      data: { trialEndsAt: newTrialEndsAt },
    })

    return { success: true, trialEndsAt: newTrialEndsAt }
  })
