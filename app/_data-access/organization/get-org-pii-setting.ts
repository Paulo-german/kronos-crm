import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

/**
 * Retorna se a org oculta PII de membros.
 * Cacheado com tag org-settings:${orgId} para invalidacao quando o toggle mudar.
 */
export const getOrgPiiSetting = cache(async (orgId: string): Promise<boolean> => {
  const getCached = unstable_cache(
    async () => {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { hidePiiFromMembers: true },
      })
      return org?.hidePiiFromMembers ?? false
    },
    [`org-pii-setting-${orgId}`],
    { tags: [`org-settings:${orgId}`], revalidate: 3600 },
  )
  return getCached()
})
