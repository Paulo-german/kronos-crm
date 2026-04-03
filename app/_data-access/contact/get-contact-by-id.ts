import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone, maskCpf } from '@/_lib/pii-mask'

export interface ContactDetailDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  cpf: string | null
  isDecisionMaker: boolean
  companyId: string | null
  assignedTo: string | null
  company: {
    id: string
    name: string
  } | null
  deals: {
    id: string
    title: string
  }[]
  createdAt: Date
  updatedAt: Date
}

const fetchContactByIdFromDb = async (
  contactId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<ContactDetailDto | null> => {
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      organizationId: orgId,
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(elevated ? {} : { assignedTo: userId }),
    },
    include: {
      company: {
        select: {
          id: true,
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
  })

  if (!contact) return null

  const masked = !elevated && hidePiiFromMembers

  return {
    id: contact.id,
    name: contact.name,
    email: masked ? maskEmail(contact.email) : contact.email,
    phone: masked ? maskPhone(contact.phone) : contact.phone,
    role: contact.role,
    cpf: masked ? maskCpf(contact.cpf) : contact.cpf,
    isDecisionMaker: contact.isDecisionMaker,
    companyId: contact.companyId,
    assignedTo: contact.assignedTo,
    company: contact.company,
    deals: contact.deals.map((deal) => deal.deal),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }
}

/**
 * Busca um contato específico por ID (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContactById = async (
  contactId: string,
  ctx: RBACContext,
): Promise<ContactDetailDto | null> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const getCached = unstable_cache(
    async () => fetchContactByIdFromDb(contactId, ctx.orgId, ctx.userId, elevated, hidePiiFromMembers),
    [`contact-${contactId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}`],
    {
      tags: [`contacts:${ctx.orgId}`, `contact:${contactId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
