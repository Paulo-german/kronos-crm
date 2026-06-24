import 'server-only'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildContactFilterWhere } from '@/_data-access/contact/build-contact-filter-where'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'

/**
 * Conta os contatos que casam com os filtros de um segmento, já aplicando a
 * elegibilidade de disparo (telefone presente, não anonimizado) e o RBAC do
 * contato (MEMBER conta só os próprios). Não cacheado — muda com a base e é
 * chamado sob demanda no preview ("X contatos atingidos").
 */
export const countContactsForSegment = async (
  ctx: RBACContext,
  filters: ContactFilters,
): Promise<number> => {
  const elevated = isElevated(ctx.userRole)

  const where: Prisma.ContactWhereInput = {
    organizationId: ctx.orgId,
    // Elegibilidade de disparo (mesma regra do search-broadcast-contacts)
    phone: { not: null },
    anonymizedAt: null,
    // RBAC: MEMBER conta só os próprios contatos
    ...(elevated ? {} : { assignedTo: ctx.userId }),
    // Filtros nativos do segmento
    ...buildContactFilterWhere(filters),
  }

  return db.contact.count({ where })
}
