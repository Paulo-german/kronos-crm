import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export type ContactOptionDto = {
  id: string
  name: string
  phone: string | null
}

const fetchContactsOptionsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
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
    },
    orderBy: {
      name: 'asc',
    },
    take: 100,
  })

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
  }))
}

/**
 * Busca contatos para uso em selects/comboboxes (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContactsOptions = async (
  ctx: RBACContext,
): Promise<ContactOptionDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchContactsOptionsFromDb(ctx.orgId, ctx.userId, elevated),
    [`contacts-options-${ctx.orgId}-${ctx.userId}-${elevated}`],
    {
      tags: [`contacts:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
