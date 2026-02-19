import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface CompanyDto {
  id: string
  name: string
}

const fetchCompaniesFromDb = async (orgId: string): Promise<CompanyDto[]> => {
  return db.company.findMany({
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

/**
 * Busca todas as empresas da organização (Cacheado)
 */
export const getCompanies = async (orgId: string): Promise<CompanyDto[]> => {
  const getCached = unstable_cache(
    async () => fetchCompaniesFromDb(orgId),
    [`companies-${orgId}`],
    {
      tags: [`companies:${orgId}`],
    },
  )

  return getCached()
}
