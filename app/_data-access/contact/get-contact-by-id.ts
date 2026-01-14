import 'server-only'
import { db } from '@/_lib/prisma'

export interface ContactDetailDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  cpf: string | null
  isDecisionMaker: boolean
  companyId: string | null
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
 * Multi-tenancy via ownerId direto
 */
export const getContactById = async (
  contactId: string,
  userId: string,
): Promise<ContactDetailDto | null> => {
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      ownerId: userId,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      deals: {
        select: {
          id: true,
          title: true,
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
    company: contact.company,
    deals: contact.deals,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }
}
