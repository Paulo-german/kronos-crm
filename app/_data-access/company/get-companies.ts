import 'server-only'
import { db } from '@/_lib/prisma'

export interface CompanyDto {
  id: string
  name: string
}

export const getCompanies = async (orgId: string): Promise<CompanyDto[]> => {
  return await db.company.findMany({
    where: {
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })
}
