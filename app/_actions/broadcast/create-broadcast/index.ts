'use server'

import {
  BroadcastRecipientStatus,
  BroadcastStatus,
  ConsentEventType,
} from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { toE164 } from '@/_utils/to-e164'
import { ALLOWED_BROADCAST_CONNECTIONS, createBroadcastSchema } from '../schema'

// Provedores cuja prontidão exige conexão ativa confirmada antes do disparo
const CONNECTION_REQUIRES_EVOLUTION_LINK = 'EVOLUTION'

export const createBroadcast = orgActionClient
  .schema(createBroadcastSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Permissão base (MEMBER não cria — recurso de alto impacto)
    requirePermission(canPerformAction(ctx, 'broadcast', 'create'))

    // 2. Inbox de origem precisa existir e pertencer à organização
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        isActive: true,
        connectionType: true,
        evolutionConnected: true,
      },
    })

    if (!inbox) {
      throw new Error(
        'Caixa de entrada não encontrada ou não pertence à organização.',
      )
    }

    // 3. Validação de provedor: whitelist > blacklist. Bloqueia SIMULATOR e
    //    qualquer connectionType interno futuro automaticamente.
    const allowedConnections: readonly string[] = ALLOWED_BROADCAST_CONNECTIONS
    if (!allowedConnections.includes(inbox.connectionType)) {
      throw new Error(
        'Esta caixa de entrada usa um provedor interno e não suporta disparos em massa.',
      )
    }

    // 4. A inbox precisa estar pronta para enviar
    if (!inbox.isActive) {
      throw new Error('Esta caixa de entrada está inativa.')
    }
    if (
      inbox.connectionType === CONNECTION_REQUIRES_EVOLUTION_LINK &&
      !inbox.evolutionConnected
    ) {
      throw new Error(
        'A conexão desta caixa de entrada não está ativa no momento.',
      )
    }

    // 4b. Conteúdo conforme o provedor:
    //  - META_CLOUD exige template HSM (Meta rejeita texto livre fora da janela de 24h,
    //    que é exatamente o caso de lista fria).
    //  - EVOLUTION/Z_API usam texto livre.
    const isMetaCloud = inbox.connectionType === 'META_CLOUD'
    if (isMetaCloud && (!data.templateName || !data.templateLanguage)) {
      throw new Error(
        'Disparos por Meta Cloud exigem um template aprovado (a Meta não permite texto livre fora da janela de 24h).',
      )
    }
    if (!isMetaCloud && !data.messageContent?.trim()) {
      throw new Error('A mensagem do disparo é obrigatória.')
    }

    // 5. Resolve contatos da org com snapshot do telefone e estado de privacidade.
    //    SKIPPED (mantém o contador honesto) quando: sem telefone válido,
    //    contato anonimizado (LGPD/DSR) ou com consentimento retirado (opt-out).
    const contacts = await db.contact.findMany({
      where: { id: { in: data.contactIds }, organizationId: ctx.orgId },
      select: {
        id: true,
        phone: true,
        anonymizedAt: true,
        consentEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { eventType: true },
        },
      },
    })

    if (contacts.length === 0) {
      throw new Error('Nenhum contato válido foi encontrado para o disparo.')
    }

    const recipientsData = contacts.map((contact) => {
      const phoneSnapshot = toE164(contact.phone)
      // Último evento de consentimento WITHDRAWN = opt-out ativo
      const optedOut =
        contact.consentEvents[0]?.eventType === ConsentEventType.WITHDRAWN
      const skip = Boolean(contact.anonymizedAt) || optedOut || !phoneSnapshot
      return {
        contactId: contact.id,
        phoneSnapshot: phoneSnapshot ?? '',
        status: skip
          ? BroadcastRecipientStatus.SKIPPED
          : BroadcastRecipientStatus.PENDING,
      }
    })

    const skippedCount = recipientsData.filter(
      (recipient) => recipient.status === BroadcastRecipientStatus.SKIPPED,
    ).length
    const totalRecipients = recipientsData.length
    // Contatos pedidos que não existem/não são da org — informa para o front avisar
    const notFoundCount = new Set(data.contactIds).size - recipientsData.length

    // Agendado → SCHEDULED (worker promove na janela); imediato → RUNNING
    const status = data.scheduledFor
      ? BroadcastStatus.SCHEDULED
      : BroadcastStatus.RUNNING

    const broadcast = await db.$transaction(async (tx) => {
      const created = await tx.broadcast.create({
        data: {
          organizationId: ctx.orgId,
          inboxId: inbox.id,
          // Snapshot do provedor usado (auditoria/dashboards históricos)
          connectionType: inbox.connectionType,
          name: data.name,
          messageContent: data.messageContent ?? null,
          // Template só para META_CLOUD; demais provedores ficam null
          templateName: isMetaCloud ? data.templateName : null,
          templateLanguage: isMetaCloud ? data.templateLanguage : null,
          templateParams:
            isMetaCloud && data.templateParams?.length
              ? data.templateParams
              : undefined,
          throttleMs: data.throttleMs,
          status,
          totalRecipients,
          skippedCount,
          scheduledFor: data.scheduledFor ?? null,
          startedAt: status === BroadcastStatus.RUNNING ? new Date() : null,
          createdBy: ctx.userId,
        },
      })

      await tx.broadcastRecipient.createMany({
        data: recipientsData.map((recipient) => ({
          broadcastId: created.id,
          contactId: recipient.contactId,
          phoneSnapshot: recipient.phoneSnapshot,
          status: recipient.status,
        })),
        // Defensivo: o unique (broadcastId, contactId) protege contra duplicatas
        // mesmo que o client envie contactIds repetidos
        skipDuplicates: true,
      })

      return created
    })

    revalidateTag(`broadcasts:${ctx.orgId}`)

    // TODO(worker): quando a task Trigger.dev existir, disparar
    // tasks.trigger('process-broadcasts-cron') aqui para broadcasts RUNNING,
    // evitando esperar o tick de 1 min. A cron de fundo cobre agendados/recovery.

    return {
      success: true as const,
      broadcastId: broadcast.id,
      totalRecipients,
      skippedCount,
      notFoundCount,
    }
  })
