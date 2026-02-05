import 'server-only'
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
  createdAt: Date
  updatedAt: Date
}

/**
 * Busca todos os contatos da organização
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContacts = async (ctx: RBACContext): Promise<ContactDto[]> => {
  const contacts = await db.contact.findMany({
    where: {
      organizationId: ctx.orgId,
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
    },
    include: {
      company: {
        select: {
          name: true,
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
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }))
}
