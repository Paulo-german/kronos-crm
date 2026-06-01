import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { OrgContext } from '@/_data-access/organization/get-organization-context'

export interface EmailBlocklistDto {
  id: string
  email: string
  reason: string
  blockedAt: Date
  blockedBy: string | null
}

const fetchEmailBlocklistFromDb = async (orgId: string): Promise<EmailBlocklistDto[]> => {
  const entries = await db.emailBlocklist.findMany({
    where: { organizationId: orgId },
    orderBy: { blockedAt: 'desc' },
  })

  return entries.map((entry) => ({
    id: entry.id,
    email: entry.email,
    reason: entry.reason,
    blockedAt: entry.blockedAt,
    blockedBy: entry.blockedBy,
  }))
}

export const getEmailBlocklist = cache(async (ctx: OrgContext): Promise<EmailBlocklistDto[]> => {
  const getCached = unstable_cache(
    async () => fetchEmailBlocklistFromDb(ctx.orgId),
    [`email-blocklist-${ctx.orgId}`],
    { tags: [`email-blocklist:${ctx.orgId}`] },
  )

  return getCached()
})
