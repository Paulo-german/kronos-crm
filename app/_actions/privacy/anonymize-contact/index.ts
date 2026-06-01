'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac/permissions'
import { anonymizeContactSchema } from './schema'

export const anonymizeContact = orgActionClient
  .schema(anonymizeContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem anonimizar contatos.')
    }

    const contact = await db.contact.findFirst({
      where: { id: data.contactId, organizationId: ctx.orgId },
      select: { id: true, email: true, anonymizedAt: true },
    })

    if (!contact) {
      throw new Error('Contato não encontrado ou não pertence à organização.')
    }

    if (contact.anonymizedAt) {
      throw new Error('Este contato já foi anonimizado.')
    }

    const privacy = await db.contactPrivacy.findUnique({
      where: { contactId: data.contactId },
      select: { id: true, legalBasis: true },
    })

    // Validar DSR antes da transação — erro aqui não deve rolar back a anonimização
    if (data.dsrRequestId) {
      const dsrRequest = await db.dsrRequest.findFirst({
        where: { id: data.dsrRequestId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!dsrRequest) {
        throw new Error('Solicitação DSR não encontrada ou não pertence à organização.')
      }
    }

    await db.$transaction(async (tx) => {
      // 1. Apagar dados PII do contato
      await tx.contact.update({
        where: { id: data.contactId },
        data: {
          name: 'Contato anonimizado',
          email: null,
          phone: null,
          role: null,
          anonymizedAt: new Date(),
        },
      })

      // 2. Apagar todos os custom field values do contato
      await tx.customFieldValue.deleteMany({
        where: { entityId: data.contactId },
      })

      // 3. Registrar e-mail na blocklist (registro histórico informacional)
      if (contact.email) {
        const normalizedEmail = contact.email.toLowerCase().trim()
        await tx.emailBlocklist.upsert({
          where: { organizationId_email: { organizationId: ctx.orgId, email: normalizedEmail } },
          create: {
            organizationId: ctx.orgId,
            email: normalizedEmail,
            reason: 'GDPR_ERASURE',
            blockedBy: ctx.userId,
          },
          update: {},
        })
      }

      // 4. Criar ConsentEvent WITHDRAWN como prova de compliance
      if (privacy) {
        await tx.consentEvent.create({
          data: {
            contactId: data.contactId,
            privacyId: privacy.id,
            eventType: 'WITHDRAWN',
            legalBasis: privacy.legalBasis,
            legalBasisSource: 'ADMIN_UPDATE',
            performedBy: ctx.userId,
            notes: data.notes ?? 'Anonimização por solicitação do titular.',
          },
        })
      }

      // 5. Concluir DsrRequest vinculada (se houver)
      if (data.dsrRequestId) {
        await tx.dsrRequest.update({
          where: { id: data.dsrRequestId, organizationId: ctx.orgId },
          data: {
            status: 'COMPLETED',
            contactId: null,
            resolvedBy: ctx.userId,
            resolvedAt: new Date(),
          },
        })
      }
    })

    revalidateTag(`privacy:${data.contactId}`)
    revalidateTag(`contact:${data.contactId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`email-blocklist:${ctx.orgId}`)
    revalidateTag(`dsr-requests:${ctx.orgId}`)

    return { success: true }
  })
