import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { OrgContext } from '@/_data-access/organization/get-organization-context'
import type { DsrRequestType, DsrRequestStatus } from '@prisma/client'

export interface DsrRequestDto {
  id: string
  requestType: DsrRequestType
  status: DsrRequestStatus
  requesterEmail: string
  requesterName: string | null
  contactId: string | null
  notes: string | null
  resolvedAt: Date | null
  resolvedBy: string | null
  createdAt: Date
  updatedAt: Date
}

const fetchDsrRequestsFromDb = async (orgId: string): Promise<DsrRequestDto[]> => {
  const requests = await db.dsrRequest.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  })

  return requests.map((request) => ({
    id: request.id,
    requestType: request.requestType,
    status: request.status,
    requesterEmail: request.requesterEmail,
    requesterName: request.requesterName,
    contactId: request.contactId,
    notes: request.notes,
    resolvedAt: request.resolvedAt,
    resolvedBy: request.resolvedBy,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }))
}

export const getDsrRequests = cache(async (ctx: OrgContext): Promise<DsrRequestDto[]> => {
  const getCached = unstable_cache(
    async () => fetchDsrRequestsFromDb(ctx.orgId),
    [`dsr-requests-${ctx.orgId}`],
    { tags: [`dsr-requests:${ctx.orgId}`] },
  )

  return getCached()
})
