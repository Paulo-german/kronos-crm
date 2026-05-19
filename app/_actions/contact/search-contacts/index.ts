'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import { isElevated } from '@/_lib/rbac'
import { maskPhone } from '@/_lib/pii-mask'
import { searchContactsSchema } from './schema'

const MAX_RESULTS = 10

interface ContactRow {
  id: string
  name: string
  phone: string | null
  assignedTo: string | null
}

export const searchContacts = orgActionClient
  .schema(searchContactsSchema)
  .action(async ({ parsedInput: { query }, ctx }) => {
    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false

    const rbacClause = elevated
      ? Prisma.empty
      : Prisma.sql`AND assigned_to = ${ctx.userId}`

    const contacts = await db.$queryRaw<ContactRow[]>`
      SELECT id, name, phone, assigned_to AS "assignedTo"
      FROM contacts
      WHERE organization_id = ${ctx.orgId}
        ${rbacClause}
        AND unaccent(lower(name)) LIKE '%' || unaccent(lower(${query})) || '%'
      ORDER BY name ASC
      LIMIT ${MAX_RESULTS}
    `

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: !elevated && hidePii ? maskPhone(contact.phone) : contact.phone,
      assignedTo: contact.assignedTo,
    }))
  })
