import 'server-only'
import { db } from '@/_lib/prisma'
import type { Prisma, ContactPrivacy, LegalBasis, LegalBasisSource } from '@prisma/client'

// Aceita PrismaClient direto OU TransactionClient.
// Motivo: alguns callers abrem $transaction (passam tx), outros criam o contato
// com bare await db.contact.create (passam db). Ambos expõem a mesma API de models.
type DbOrTx = typeof db | Prisma.TransactionClient

interface CreateContactPrivacyInput {
  contactId: string
  legalBasis: LegalBasis
  legalBasisSource: LegalBasisSource
  consentText?: string
  consentIp?: string
  consentVersion?: string
  performedBy?: string | null
}

/**
 * Único ponto de escrita de ContactPrivacy + ConsentEvent(GRANTED) inicial.
 * Reutilizado por todos os canais de criação de contato para evitar duplicação.
 * consentedAt só é preenchido quando a base legal é CONSENT (manifestação afirmativa).
 */
export async function createContactPrivacy(
  dbOrTx: DbOrTx,
  input: CreateContactPrivacyInput,
): Promise<ContactPrivacy> {
  const isConsent = input.legalBasis === 'CONSENT'

  const privacy = await dbOrTx.contactPrivacy.create({
    data: {
      contactId: input.contactId,
      legalBasis: input.legalBasis,
      legalBasisSource: input.legalBasisSource,
      consentText: input.consentText ?? null,
      consentVersion: input.consentVersion ?? null,
      consentIp: input.consentIp ?? null,
      consentedAt: isConsent ? new Date() : null,
    },
  })

  await dbOrTx.consentEvent.create({
    data: {
      contactId: input.contactId,
      privacyId: privacy.id,
      eventType: 'GRANTED',
      legalBasis: input.legalBasis,
      legalBasisSource: input.legalBasisSource,
      consentText: input.consentText ?? null,
      consentIp: input.consentIp ?? null,
      performedBy: input.performedBy ?? null,
    },
  })

  return privacy
}
