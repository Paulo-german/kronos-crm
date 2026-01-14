import 'server-only'
import { db } from '@/_lib/prisma'

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
  createdAt: Date
  updatedAt: Date
}

/**
 * Busca todos os contatos do usuário
 * Multi-tenancy via ownerId direto
 */
export const getContacts = async (userId: string): Promise<ContactDto[]> => {
  const contacts = await db.contact.findMany({
    where: {
      ownerId: userId,
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
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }))
}
