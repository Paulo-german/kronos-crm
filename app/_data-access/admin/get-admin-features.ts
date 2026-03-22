import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminFeatureDto } from './types'

export async function getAdminFeatures(): Promise<AdminFeatureDto[]> {
  const features = await db.feature.findMany({
    orderBy: { key: 'asc' },
    select: {
      id: true,
      key: true,
      name: true,
      type: true,
      valueType: true,
      module: {
        select: { slug: true, name: true },
      },
      _count: {
        select: { planLimits: true },
      },
    },
  })

  return features.map((feature) => ({
    id: feature.id,
    key: feature.key,
    name: feature.name,
    type: feature.type,
    valueType: feature.valueType,
    module: feature.module,
    planLimitCount: feature._count.planLimits,
  }))
}
