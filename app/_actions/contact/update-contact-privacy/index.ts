'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateContactPrivacySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { isElevated } from '@/_lib/rbac'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'
import type { ConsentEventType, LegalBasis } from '@prisma/client'

// Determina o tipo de evento de consentimento conforme a transição de base legal.
function resolveConsentEventType(
  previousBasis: LegalBasis,
  nextBasis: LegalBasis,
): ConsentEventType {
  if (previousBasis !== 'CONSENT' && nextBasis === 'CONSENT') return 'GRANTED'
  if (previousBasis === 'CONSENT' && nextBasis !== 'CONSENT') return 'WITHDRAWN'
  return 'UPDATED'
}

export const updateContactPrivacy = orgActionClient
  .schema(updateContactPrivacySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // RBAC: base legal é decisão de compliance, restrita a ADMIN/OWNER
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem alterar a base legal.')
    }

    // Contato precisa pertencer à organização do contexto
    const contact = await db.contact.findFirst({
      where: { id: data.contactId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!contact) {
      throw new Error('Contato não encontrado ou não pertence à organização.')
    }

    const existing = await db.contactPrivacy.findUnique({
      where: { contactId: data.contactId },
      select: { id: true, legalBasis: true, ccpaSaleOptOut: true },
    })

    // Sem registro de privacidade (contato anterior ao backfill) → cria via helper
    if (!existing) {
      await createContactPrivacy(db, {
        contactId: data.contactId,
        legalBasis: data.legalBasis,
        legalBasisSource: 'ADMIN_UPDATE',
        performedBy: ctx.userId,
      })

      revalidateTag(`privacy:${data.contactId}`)
      revalidateTag(`contact:${data.contactId}`)
      return { success: true }
    }

    const eventType = resolveConsentEventType(existing.legalBasis, data.legalBasis)
    const ccpaChanged =
      data.ccpaSaleOptOut !== undefined && data.ccpaSaleOptOut !== existing.ccpaSaleOptOut

    await db.$transaction(async (tx) => {
      await tx.contactPrivacy.update({
        where: { id: existing.id },
        data: {
          legalBasis: data.legalBasis,
          ...(data.ccpaSaleOptOut !== undefined
            ? { ccpaSaleOptOut: data.ccpaSaleOptOut }
            : {}),
          ...(ccpaChanged ? { ccpaKnownAt: new Date() } : {}),
        },
      })

      await tx.consentEvent.create({
        data: {
          contactId: data.contactId,
          privacyId: existing.id,
          eventType,
          legalBasis: data.legalBasis,
          legalBasisSource: 'ADMIN_UPDATE',
          performedBy: ctx.userId,
          notes: data.notes ?? null,
        },
      })
    })

    revalidateTag(`privacy:${data.contactId}`)
    revalidateTag(`contact:${data.contactId}`)

    return { success: true }
  })
