import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { OrgContext } from '@/_data-access/organization/get-organization-context'
import type { ConsentEventType, LegalBasis, LegalBasisSource } from '@prisma/client'

// Quantidade de eventos de consentimento embutidos no DTO de privacidade.
// O histórico completo é paginado por get-consent-events.
const RECENT_EVENTS_LIMIT = 20

export interface ConsentEventDto {
  id: string
  eventType: ConsentEventType
  legalBasis: LegalBasis
  legalBasisSource: LegalBasisSource
  consentText: string | null
  performedBy: string | null
  notes: string | null
  createdAt: Date
}

export interface ContactPrivacyDto {
  id: string
  legalBasis: LegalBasis
  legalBasisSource: LegalBasisSource
  consentText: string | null
  consentVersion: string | null
  consentedAt: Date | null
  consentIp: string | null
  ccpaSaleOptOut: boolean
  ccpaKnownAt: Date | null
  createdAt: Date
  updatedAt: Date
  recentEvents: ConsentEventDto[]
}

const fetchContactPrivacyFromDb = async (
  contactId: string,
  orgId: string,
): Promise<ContactPrivacyDto | null> => {
  // O filtro por contact.organizationId garante isolamento de org (RBAC de tenant).
  const privacy = await db.contactPrivacy.findFirst({
    where: {
      contactId,
      contact: { organizationId: orgId },
    },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
        take: RECENT_EVENTS_LIMIT,
      },
    },
  })

  if (!privacy) return null

  return {
    id: privacy.id,
    legalBasis: privacy.legalBasis,
    legalBasisSource: privacy.legalBasisSource,
    consentText: privacy.consentText,
    consentVersion: privacy.consentVersion,
    consentedAt: privacy.consentedAt,
    consentIp: privacy.consentIp,
    ccpaSaleOptOut: privacy.ccpaSaleOptOut,
    ccpaKnownAt: privacy.ccpaKnownAt,
    createdAt: privacy.createdAt,
    updatedAt: privacy.updatedAt,
    recentEvents: privacy.events.map((event) => ({
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
 * Busca a privacidade (base legal LGPD/GDPR/CCPA) de um contato + últimos
 * eventos de consentimento (Cacheado).
 *
 * O cache não usa userId na key porque a privacidade é visível para toda a org;
 * o RBAC de acesso ao contato em si já é feito na page. A invalidação é 100%
 * por tag (privacy:${contactId}), sem TTL fixo — mesmo padrão do get-contact-by-id.
 */
export const getContactPrivacy = cache(async (
  ctx: OrgContext,
  contactId: string,
): Promise<ContactPrivacyDto | null> => {
  const getCached = unstable_cache(
    async () => fetchContactPrivacyFromDb(contactId, ctx.orgId),
    [`contact-privacy-${contactId}`],
    {
      tags: [`privacy:${contactId}`],
    },
  )

  return getCached()
})
