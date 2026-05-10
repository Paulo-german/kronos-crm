import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ProfessionalDto {
  id: string
  organizationId: string
  userId: string | null
  name: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const fetchProfessionalsFromDb = async (
  orgId: string,
): Promise<ProfessionalDto[]> => {
  const professionals = await db.professional.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
  })

  return professionals.map((professional) => ({
    id: professional.id,
    organizationId: professional.organizationId,
    userId: professional.userId,
    name: professional.name,
    phone: professional.phone,
    bio: professional.bio,
    avatarUrl: professional.avatarUrl,
    isActive: professional.isActive,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  }))
}

/**
 * Lista profissionais da organização (Cacheado)
 */
export const getProfessionals = cache(async (orgId: string): Promise<ProfessionalDto[]> => {
  const getCached = unstable_cache(
    async () => fetchProfessionalsFromDb(orgId),
    [`professionals-${orgId}`],
    {
      tags: [`professionals:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})
