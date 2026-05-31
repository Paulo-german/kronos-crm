import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { OrgContext } from '@/_data-access/organization/get-organization-context'
import type { ConsentEventDto } from './get-contact-privacy'

// Tamanho de página do histórico completo de eventos de consentimento.
const PAGE_SIZE = 20

export interface ConsentEventsPage {
  events: ConsentEventDto[]
  total: number
}

const fetchConsentEventsFromDb = async (
  contactId: string,
  orgId: string,
  page: number,
): Promise<ConsentEventsPage> => {
  // O filtro por contact.organizationId garante isolamento de org (RBAC de tenant).
  const where = {
    contactId,
    contact: { organizationId: orgId },
  }

  const skip = (page - 1) * PAGE_SIZE

  const [events, total] = await Promise.all([
    db.consentEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    db.consentEvent.count({ where }),
  ])

  return {
    total,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      legalBasis: event.legalBasis,
      legalBasisSource: event.legalBasisSource,
      consentText: event.consentText,
      performedBy: event.performedBy,
      notes: event.notes,
      createdAt: event.createdAt,
    })),
  }
}

/**
 * Lista paginada do histórico completo de eventos de consentimento de um
 * contato (Cacheado). Compartilha a tag privacy:${contactId} com
 * getContactPrivacy — qualquer mutação de privacidade invalida ambos.
 *
 * Invalidação 100% por tag, sem TTL fixo (mesmo padrão do get-contact-by-id).
 */
export const getConsentEvents = cache(async (
  ctx: OrgContext,
  contactId: string,
  page: number,
): Promise<ConsentEventsPage> => {
  const getCached = unstable_cache(
    async () => fetchConsentEventsFromDb(contactId, ctx.orgId, page),
    [`consent-events-${contactId}-${page}`],
    {
      tags: [`privacy:${contactId}`],
    },
  )

  return getCached()
})
