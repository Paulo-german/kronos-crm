import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskPhone } from '@/_lib/pii-mask'

export type ContactOptionDto = {
  id: string
  name: string
  phone: string | null
  assignedTo: string | null
}

const fetchContactsOptionsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<ContactOptionDto[]> => {
  const contacts = await db.contact.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      assignedTo: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 100,
  })

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: (!elevated && hidePiiFromMembers) ? maskPhone(contact.phone) : contact.phone,
    assignedTo: contact.assignedTo,
  }))
}

/**
 * Busca contatos para uso em selects/comboboxes (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContactsOptions = cache(async (
  ctx: RBACContext,
): Promise<ContactOptionDto[]> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const getCached = unstable_cache(
    async () => fetchContactsOptionsFromDb(ctx.orgId, ctx.userId, elevated, hidePiiFromMembers),
    [`contacts-options-${ctx.orgId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}`],
    {
      tags: [`contacts:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})
