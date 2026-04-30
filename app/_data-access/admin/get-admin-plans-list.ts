import 'server-only'
import { db } from '@/_lib/prisma'

export interface AdminPlanListItem {
  id: string
  name: string
  slug: string
}

export async function getAdminPlansList(): Promise<AdminPlanListItem[]> {
  return db.plan.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
}
