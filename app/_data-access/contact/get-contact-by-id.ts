import 'server-only'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

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

/**
 * Busca um contato específico por ID
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContactById = async (
  contactId: string,
  ctx: RBACContext,
): Promise<ContactDetailDto | null> => {
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      organizationId: ctx.orgId,
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
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

  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    cpf: contact.cpf,
    isDecisionMaker: contact.isDecisionMaker,
    companyId: contact.companyId,
    assignedTo: contact.assignedTo,
    company: contact.company,
    deals: contact.deals.map((deal) => deal.deal),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }
}
