import 'server-only'
import { db } from '@/_lib/prisma'
import type { OrganizationOptionDto } from './types'

/**
 * Lista todas as organizações ativas (com ao menos 1 membro ACCEPTED).
 * Inclui contagem de membros para exibição no multi-select do form de comunicados.
 * Sem cache: painel admin de baixo volume, dados devem estar sempre frescos.
 */
export async function getAllOrganizations(): Promise<OrganizationOptionDto[]> {
  const organizations = await db.organization.findMany({
    where: {
      members: {
        some: { status: 'ACCEPTED' },
      },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          members: {
            where: { status: 'ACCEPTED' },
          },
        },
      },
    },
  })

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    memberCount: org._count.members,
  }))
}
