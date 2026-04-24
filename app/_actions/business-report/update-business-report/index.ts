'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { updateBusinessReportSchema } from './schema'

export const updateBusinessReport = superAdminActionClient
  .schema(updateBusinessReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const reportData = {
      costItems: parsedInput.costItems,
      aiMonthlyCostBrl: parsedInput.aiMonthlyCostBrl,
      targetMarginPct: parsedInput.targetMarginPct,
      updatedById: ctx.userId,
    }

    await db.businessReport.upsert({
      where: { singletonKey: 'singleton' },
      create: { singletonKey: 'singleton', ...reportData },
      update: reportData,
    })

    revalidateTag('business-report')

    return { success: true }
  })
