'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import { isElevated } from '@/_lib/rbac'
import { searchDealsSchema } from './schema'

const MAX_RESULTS = 10

interface DealRow {
  id: string
  title: string
  contactId: string | null
  contactName: string | null
}

export const searchDeals = orgActionClient
  .schema(searchDealsSchema)
  .action(async ({ parsedInput: { query }, ctx }) => {
    const elevated = isElevated(ctx.userRole)

    const rbacClause = elevated
      ? Prisma.empty
      : Prisma.sql`AND d.assigned_to = ${ctx.userId}`

    const deals = await db.$queryRaw<DealRow[]>`
      SELECT
        d.id,
        d.title,
        first_contact.id   AS "contactId",
        first_contact.name AS "contactName"
      FROM deals d
      LEFT JOIN LATERAL (
        SELECT c.id, c.name
        FROM contacts c
        JOIN deal_contacts dc ON dc.contact_id = c.id
        WHERE dc.deal_id = d.id
        LIMIT 1
      ) first_contact ON true
      WHERE d.organization_id = ${ctx.orgId}
        AND d.status IN ('OPEN', 'IN_PROGRESS')
        ${rbacClause}
        AND unaccent(lower(d.title)) LIKE '%' || unaccent(lower(${query})) || '%'
      ORDER BY d.updated_at DESC
      LIMIT ${MAX_RESULTS}
    `

    return deals
  })
