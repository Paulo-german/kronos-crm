'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { maskPhone } from '@/_lib/pii-mask'
import { searchContactsSchema } from './schema'

const MAX_RESULTS = 10

export const searchContacts = orgActionClient
  .schema(searchContactsSchema)
  .action(async ({ parsedInput: { query }, ctx }) => {
    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const contacts = await db.contact.findMany({
      where: {
        organizationId: ctx.orgId,
        ...(elevated ? {} : { assignedTo: ctx.userId }),
        name: { contains: normalizedQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        assignedTo: true,
      },
      orderBy: { name: 'asc' },
      take: MAX_RESULTS,
    })

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: (!elevated && hidePii) ? maskPhone(contact.phone) : contact.phone,
      assignedTo: contact.assignedTo,
    }))
  })
