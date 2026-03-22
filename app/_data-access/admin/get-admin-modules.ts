import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminModuleDto } from './types'

export async function getAdminModules(): Promise<AdminModuleDto[]> {
  const modules = await db.module.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      _count: {
        select: { features: true },
      },
    },
  })

  return modules.map((module) => ({
    id: module.id,
    slug: module.slug,
    name: module.name,
    isActive: module.isActive,
    featureCount: module._count.features,
  }))
}
