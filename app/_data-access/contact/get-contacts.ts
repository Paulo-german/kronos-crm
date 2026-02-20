import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

export interface ContactDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  cpf: string | null
  isDecisionMaker: boolean
  companyId: string | null
  companyName: string | null
  assignedTo: string | null
  deals: { id: string; title: string }[]
  createdAt: Date
  updatedAt: Date
}

const fetchContactsFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<ContactDto[]> => {
  const contacts = await db.contact.findMany({
    where: {
      organizationId: orgId,
      ...(elevated ? {} : { assignedTo: userId }),
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      deals: {
        include: {
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    cpf: contact.cpf,
    isDecisionMaker: contact.isDecisionMaker,
    companyId: contact.companyId,
    companyName: contact.company?.name ?? null,
    assignedTo: contact.assignedTo,
    deals: contact.deals.map((dc) => dc.deal),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }))
}

/**
 * Busca todos os contatos da organização (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContacts = async (ctx: RBACContext): Promise<ContactDto[]> => {
  const elevated = isElevated(ctx.userRole)

  const getCached = unstable_cache(
    async () => fetchContactsFromDb(ctx.orgId, ctx.userId, elevated),
    [`contacts-${ctx.orgId}-${ctx.userId}`],
    {
      tags: [`contacts:${ctx.orgId}`],
    },
  )

  return getCached()
}
