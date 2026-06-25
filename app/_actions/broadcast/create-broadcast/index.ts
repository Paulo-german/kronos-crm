'use server'

import {
  BroadcastRecipientStatus,
  BroadcastStatus,
  ConsentEventType,
  type Prisma,
} from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, isElevated, requirePermission } from '@/_lib/rbac'
import { toE164 } from '@/_utils/to-e164'
import { buildContactFilterWhere } from '@/_data-access/contact/build-contact-filter-where'
import { triggerBroadcastRun } from '@/../trigger/lib/broadcast-queue'
import { isInboxEligibleForBroadcast } from '@/_lib/whatsapp/broadcast-eligibility'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'
import { MAX_BROADCAST_RECIPIENTS, createBroadcastSchema } from '../schema'

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
        evolutionApiUrl: true,
        evolutionApiKey: true,
      },
    })

    if (!inbox) {
      throw new Error(
        'Caixa de entrada não encontrada ou não pertence à organização.',
      )
    }

    // 3. Só canais selfhosted reais (Evolution Go ou Evolution com servidor
    //    próprio) suportam disparo em massa. Mesmo critério da query elegível.
    if (!isInboxEligibleForBroadcast(inbox)) {
      throw new Error(
        'Esta caixa de entrada não é um canal self-hosted e não suporta disparos em massa.',
      )
    }

    // 4. A inbox precisa estar pronta para enviar (WhatsApp vinculado)
    if (!inbox.isActive) {
      throw new Error('Esta caixa de entrada está inativa.')
    }
    // Só os provedores Evolution exigem o WhatsApp vinculado (evolutionConnected);
    // Meta Cloud e Z-API não usam esse flag.
    const isEvolution =
      inbox.connectionType === 'EVOLUTION' ||
      inbox.connectionType === 'EVOLUTION_JS' ||
      inbox.connectionType === 'EVOLUTION_GO'
    if (isEvolution && !inbox.evolutionConnected) {
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

    // 5. Resolve o conjunto de contatos conforme o modo de seleção.
    //    Modo manual → ids escolhidos. Modo segmento → filtros salvos resolvidos
    //    no servidor (RBAC + elegibilidade), nunca confiando em ids do client.
    const elevated = isElevated(ctx.userRole)
    let contactWhere: Prisma.ContactWhereInput

    if (data.segmentId) {
      const segment = await db.contactSegment.findFirst({
        where: { id: data.segmentId, organizationId: ctx.orgId },
        select: { filters: true },
      })
      if (!segment) {
        throw new Error('Segmentação não encontrada ou sem acesso.')
      }
      const filters = segment.filters as unknown as ContactFilters
      contactWhere = {
        organizationId: ctx.orgId,
        // Elegibilidade (mesma do preview): telefone presente, não anonimizado
        phone: { not: null },
        anonymizedAt: null,
        ...(elevated ? {} : { assignedTo: ctx.userId }),
        ...buildContactFilterWhere(filters),
      }
    } else {
      contactWhere = {
        id: { in: data.contactIds ?? [] },
        organizationId: ctx.orgId,
        ...(elevated ? {} : { assignedTo: ctx.userId }),
      }
    }

    const contacts = await db.contact.findMany({
      where: contactWhere,
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
      // Teto de segurança: segmento amplo não pode estourar o limite do disparo
      take: MAX_BROADCAST_RECIPIENTS + 1,
    })

    if (contacts.length === 0) {
      throw new Error('Nenhum contato válido foi encontrado para o disparo.')
    }

    if (contacts.length > MAX_BROADCAST_RECIPIENTS) {
      throw new Error(
        `O segmento resolve mais de ${MAX_BROADCAST_RECIPIENTS.toLocaleString('pt-BR')} contatos. Refine os filtros para reduzir o público.`,
      )
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
    // Contatos pedidos que não existem/não são da org — só no modo manual
    const notFoundCount = data.contactIds
      ? new Set(data.contactIds).size - recipientsData.length
      : 0

    // Status inicial:
    //  - agendado → SCHEDULED (watchdog promove na janela)
    //  - imediato → serialização por número: se a inbox já tem disparo ativo
    //    (RUNNING/QUEUED), entra na fila como QUEUED; senão começa RUNNING.
    let status: BroadcastStatus
    if (data.scheduledFor) {
      status = BroadcastStatus.SCHEDULED
    } else {
      const inboxBusy = await db.broadcast.count({
        where: {
          inboxId: inbox.id,
          status: { in: [BroadcastStatus.RUNNING, BroadcastStatus.QUEUED] },
        },
      })
      status = inboxBusy > 0 ? BroadcastStatus.QUEUED : BroadcastStatus.RUNNING
    }

    const broadcast = await db.$transaction(async (tx) => {
      const created = await tx.broadcast.create({
        data: {
          organizationId: ctx.orgId,
          inboxId: inbox.id,
          // Snapshot do provedor usado (auditoria/dashboards históricos)
          connectionType: inbox.connectionType,
          name: data.name,
          // Segmento que originou o disparo (auditoria); null no modo manual
          segmentId: data.segmentId ?? null,
          messageContent: data.messageContent ?? null,
          // Template só para META_CLOUD; demais provedores ficam null
          templateName: isMetaCloud ? data.templateName : null,
          templateLanguage: isMetaCloud ? data.templateLanguage : null,
          templateParams:
            isMetaCloud && data.templateParams?.length
              ? data.templateParams
              : undefined,
          throttleMs: data.throttleMs,
          // Janela de envio (restringe horários); fora dela a run dorme.
          sendingWindowEnabled: data.sendingWindowEnabled,
          sendingWindowConfig: data.sendingWindowEnabled
            ? (data.sendingWindowConfig as Prisma.InputJsonValue)
            : undefined,
          sendingWindowTimezone: data.sendingWindowTimezone,
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

    // Disparo imediato: nasce RUNNING → inicia a run durável na hora (o watchdog
    // cobre agendados, fila e recuperação). QUEUED espera a inbox liberar.
    if (status === BroadcastStatus.RUNNING) {
      await triggerBroadcastRun(broadcast.id, inbox.id)
    }

    return {
      success: true as const,
      broadcastId: broadcast.id,
      totalRecipients,
      skippedCount,
      notFoundCount,
    }
  })
