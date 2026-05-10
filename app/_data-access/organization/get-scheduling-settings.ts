import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { DistributionModel } from '@prisma/client'

export interface ManualOrderEntry {
  professionalId: string
  name: string
  order: number
}

export interface SchedulingSettingsDto {
  distributionModel: DistributionModel
  secondaryDistributionModel: DistributionModel | null
  manualOrder: ManualOrderEntry[]
}

const fetchSchedulingSettingsFromDb = async (orgId: string): Promise<SchedulingSettingsDto> => {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      distributionModel: true,
      secondaryDistributionModel: true,
      manualProfessionalOrders: {
        select: {
          professionalId: true,
          order: true,
          professional: { select: { name: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  return {
    distributionModel: org?.distributionModel ?? 'UTILIZATION',
    secondaryDistributionModel: org?.secondaryDistributionModel ?? null,
    manualOrder: (org?.manualProfessionalOrders ?? []).map((entry) => ({
      professionalId: entry.professionalId,
      name: entry.professional.name,
      order: entry.order,
    })),
  }
}

export const getSchedulingSettings = cache(async (orgId: string): Promise<SchedulingSettingsDto> => {
  const getCached = unstable_cache(
    async () => fetchSchedulingSettingsFromDb(orgId),
    [`scheduling-settings-${orgId}`],
    { tags: [`scheduling-settings:${orgId}`], revalidate: 3600 },
  )
  return getCached()
})
