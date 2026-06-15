import 'server-only'
import { after } from 'next/server'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { CaptureChannel, SalesDistributionModel } from '@prisma/client'
import { resolveSquadMember } from '@/_lib/distribution/resolve-squad-member'
import { inferCaptureChannelFromInboxChannel } from '@/_lib/lifecycle/infer-capture-channel'
import { matchCaptureEventToCampaign } from '@/_lib/lifecycle/match-capture-event-to-campaign'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'
import { CHANNEL_DEFAULT_LEGAL_BASIS } from '@/_lib/privacy/legal-basis-map'
import { toE164 } from '@/_utils/to-e164'
import { normalizePhoneToDigits } from '@/_lib/whatsapp/normalize-phone'

interface DealCreationContext {
  pipelineId: string | null
  distributionUserIds: string[]
  inboxId: string
  salesDistributionModel: SalesDistributionModel
  contactCurrentAssignedTo?: string | null
  squadId?: string | null
}

interface ContactAssignContext {
  distributionUserIds: string[]
  inboxId: string
  salesDistributionModel: SalesDistributionModel
  contactCurrentAssignedTo?: string | null
  squadId?: string | null
}

interface ResolveResult {
  conversationId: string
  isNew: boolean
  nameUpdated?: boolean
}

/**
 * Busca ou cria Conversation + Contact para um número de WhatsApp.
 * Usado pelo webhook quando é o primeiro contato de um remoteJid com a Inbox.
 * Quando isNew, cria automaticamente um Deal vinculado ao contato e à conversa.
 */
export async function resolveConversation(
  inboxId: string,
  orgId: string,
  remoteJid: string,
  phoneNumber: string,
  pushName: string | null,
  dealContext?: DealCreationContext,
  contactAssignContext?: ContactAssignContext,
  fromMe?: boolean,
  captureChannel: CaptureChannel = CaptureChannel.WHATSAPP,
): Promise<ResolveResult> {
  // Padroniza o número para E.164 com `+` antes de qualquer busca/criação de Contact,
  // alinhando com o storage do banco (que é E.164). O `remoteJid` permanece em dígitos.
  const phone = toE164(phoneNumber) ?? phoneNumber

  // 1. Buscar conversa existente
  const existing = await db.conversation.findFirst({
    where: { inboxId, remoteJid },
    select: { id: true, contactId: true },
  })

  if (existing) {
    // Backfill não-bloqueante: garante que contatos legados tenham ContactPrivacy
    after(() =>
      ensureContactPrivacy(existing.contactId, captureChannel).catch(
        (error) => {
          console.warn(
            '[privacy] Falha no backfill de ContactPrivacy para conversa existente',
            error,
          )
        },
      ),
    )

    // Atualizar nome do contato na primeira resposta inbound (quando nome é placeholder)
    if (!fromMe && pushName) {
      const contact = await db.contact.findFirst({
        where: { organizationId: orgId, phone },
        select: { id: true, name: true },
      })

      // Nome ainda é placeholder (= o próprio número)? Compara por dígitos para
      // também casar contatos legados cujo nome ficou em dígitos puros.
      const nameIsPhonePlaceholder =
        contact?.name != null &&
        normalizePhoneToDigits(contact.name) === normalizePhoneToDigits(phone)

      if (contact && nameIsPhonePlaceholder) {
        const conversation = await db.conversation.findFirst({
          where: { id: existing.id },
          select: { dealId: true },
        })

        await Promise.all([
          db.contact.update({
            where: { id: contact.id },
            data: { name: pushName },
          }),
          conversation?.dealId
            ? db.deal.update({
                where: { id: conversation.dealId },
                data: { title: pushName },
              })
            : Promise.resolve(),
        ])

        return { conversationId: existing.id, isNew: false, nameUpdated: true }
      }
    }

    return { conversationId: existing.id, isNew: false }
  }

  // 2. Buscar ou criar Contact pelo telefone na org
  const effectiveName = fromMe ? phone : pushName || phone

  let contact = await db.contact.findFirst({
    where: { organizationId: orgId, phone },
    // Incluir assignedTo para herdar o responsavel na criacao da conversa
    // firstCaptureAt diferencia first-touch de last-touch no bloco de captura
    select: { id: true, name: true, assignedTo: true, firstCaptureAt: true },
  })

  const isNewContact = !contact

  if (!contact) {
    contact = await db.contact.create({
      data: {
        organizationId: orgId,
        name: effectiveName,
        phone,
      },
      select: { id: true, name: true, assignedTo: true, firstCaptureAt: true },
    })
  }

  if (isNewContact) {
    try {
      const { legalBasis, legalBasisSource } =
        CHANNEL_DEFAULT_LEGAL_BASIS[captureChannel]
      await createContactPrivacy(db, {
        contactId: contact.id,
        legalBasis,
        legalBasisSource,
        performedBy: null,
      })
    } catch (error) {
      console.warn(
        '[privacy] Falha ao criar ContactPrivacy para novo contato',
        error,
      )
    }
  } else {
    // Backfill para contato legado (sem ContactPrivacy) iniciando nova conversa
    try {
      await ensureContactPrivacy(contact.id, captureChannel)
    } catch (error) {
      console.warn(
        '[privacy] Falha no backfill de ContactPrivacy para contato legado',
        error,
      )
    }
  }

  // 3. Criar Conversation herdando assignedTo do contato existente
  const conversation = await db.conversation.create({
    data: {
      inboxId,
      organizationId: orgId,
      contactId: contact.id,
      channel: 'WHATSAPP',
      remoteJid,
      // Valor inicial herdado do contato; distribuição (squad/round-robin/etc) sobrescreve logo abaixo
      assignedTo: contact.assignedTo,
    },
    select: { id: true },
  })

  // 4. Criar Deal automaticamente para nova conversa (se dealContext presente)
  // Injeta assignedTo atual do contato para suportar modelo LOYALTY sem expor ao webhook
  if (dealContext) {
    await createDealForNewConversation(
      orgId,
      contact.id,
      contact.name,
      conversation.id,
      { ...dealContext, contactCurrentAssignedTo: contact.assignedTo },
    )
  } else if (contactAssignContext) {
    // Roda distribuição para qualquer contato (novo ou existente).
    // LOYALTY é tratado dentro de resolveAssignedTo — devolve o mesmo dono se já tiver um.
    // Modelos não-LOYALTY (ROUND_ROBIN, UTILIZATION) redistribuem normalmente.
    await assignContactOwner(
      orgId,
      contact.id,
      { ...contactAssignContext, contactCurrentAssignedTo: contact.assignedTo },
      conversation.id,
    )
  }

  // 5. Registrar captura — apenas para mensagens inbound (fromMe=false).
  // fromMe=true significa que a empresa iniciou a conversa; não é captura de lead.
  if (!fromMe) {
    await recordInboundCaptureEvent({
      inboxId,
      orgId,
      contactId: contact.id,
      conversationId: conversation.id,
      contactFirstCaptureAt: contact.firstCaptureAt,
    })
  }

  if (isNewContact) {
    after(() =>
      evaluateAutomations({
        subjectKind: 'contact',
        orgId,
        triggerType: 'CONTACT_CREATED',
        contactId: contact.id,
        payload: { source: CaptureChannel.WHATSAPP },
      }),
    )
  }

  return { conversationId: conversation.id, isNew: true }
}

interface RecordInboundCaptureInput {
  inboxId: string
  orgId: string
  contactId: string
  conversationId: string
  contactFirstCaptureAt: Date | null
}

// Cria CaptureEvent e atualiza denorms (first/last touch) do Contact quando uma
// nova conversa nasce via webhook. Bloco non-fatal: erros aqui só viram log.
async function recordInboundCaptureEvent(
  input: RecordInboundCaptureInput,
): Promise<void> {
  try {
    const inbox = await db.inbox.findUnique({
      where: { id: input.inboxId },
      select: { channel: true, captureSourceId: true },
    })

    if (!inbox?.captureSourceId) {
      console.warn(
        '[resolveConversation] Inbox sem captureSourceId — pulando CaptureEvent',
        {
          inboxId: input.inboxId,
          orgId: input.orgId,
        },
      )
      return
    }

    const channel = inferCaptureChannelFromInboxChannel(inbox.channel)

    const captureEvent = await db.captureEvent.create({
      data: {
        contactId: input.contactId,
        organizationId: input.orgId,
        channel,
        sourceId: inbox.captureSourceId,
        capturedAutomatically: true,
        metadata: {
          conversationId: input.conversationId,
          inboxId: input.inboxId,
        },
      },
      select: { id: true, createdAt: true },
    })

    const isFirstCapture = input.contactFirstCaptureAt === null
    await db.contact.update({
      where: { id: input.contactId },
      data: {
        ...(isFirstCapture && {
          firstCaptureChannel: channel,
          firstCaptureAt: captureEvent.createdAt,
        }),
        lastCaptureChannel: channel,
        lastCaptureAt: captureEvent.createdAt,
      },
    })

    after(() => matchCaptureEventToCampaign(captureEvent.id, input.orgId))
  } catch (captureError) {
    console.warn('[resolveConversation] Falha ao registrar CaptureEvent:', {
      orgId: input.orgId,
      contactId: input.contactId,
      conversationId: input.conversationId,
      error:
        captureError instanceof Error
          ? captureError.message
          : String(captureError),
    })
  }
}

export async function assignContactOwner(
  orgId: string,
  contactId: string,
  context: ContactAssignContext,
  conversationId?: string,
): Promise<void> {
  try {
    const assignedTo = await resolveAssignedTo(
      orgId,
      context.distributionUserIds,
      context.inboxId,
      context.salesDistributionModel,
      context.contactCurrentAssignedTo,
      context.squadId,
    )
    if (!assignedTo) return

    await db.contact.update({
      where: { id: contactId },
      data: { assignedTo },
    })

    if (conversationId) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { assignedTo },
      })
    }
  } catch (error) {
    console.warn(
      '[resolveConversation] Falha ao atribuir contact/conversation:',
      { orgId, contactId, error },
    )
  }
}

export async function createDealForNewConversation(
  orgId: string,
  contactId: string,
  contactName: string,
  conversationId: string,
  dealContext: DealCreationContext,
): Promise<void> {
  try {
    // 1. Resolver pipelineStageId
    const firstStageId = await resolveFirstStageId(
      orgId,
      dealContext.pipelineId,
    )
    if (!firstStageId) {
      console.warn(
        '[resolveConversation] Nenhum stage encontrado para criar deal',
        { orgId },
      )
      return
    }

    // 2. Resolver assignedTo conforme o modelo de distribuição da org
    const assignedTo = await resolveAssignedTo(
      orgId,
      dealContext.distributionUserIds,
      dealContext.inboxId,
      dealContext.salesDistributionModel,
      dealContext.contactCurrentAssignedTo,
      dealContext.squadId,
    )
    if (!assignedTo) {
      console.warn(
        '[resolveConversation] Nenhum assignee encontrado para criar deal',
        { orgId },
      )
      return
    }

    // 3. Criar Deal + DealContact + vincular à Conversation + atribuir Contact
    await db.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          organizationId: orgId,
          title: contactName,
          pipelineStageId: firstStageId,
          assignedTo,
          ...(dealContext.squadId ? { squadId: dealContext.squadId } : {}),
          contacts: {
            create: {
              contactId,
              isPrimary: true,
            },
          },
        },
      })

      // Vincular deal e atribuir responsavel da conversa ao mesmo dono do deal
      await tx.conversation.update({
        where: { id: conversationId },
        data: { dealId: deal.id, assignedTo },
      })

      await tx.contact.update({
        where: { id: contactId },
        data: { assignedTo },
      })
    })
  } catch (error) {
    // Deal é opcional — não deve bloquear a criação da conversa
    console.warn('[resolveConversation] Falha ao criar deal automático:', {
      orgId,
      conversationId,
      error,
    })
  }
}

async function resolveFirstStageId(
  orgId: string,
  pipelineId?: string | null,
): Promise<string | null> {
  // Se o inbox tem pipeline configurado, usar esse
  if (pipelineId) {
    const stage = await db.pipelineStage.findFirst({
      where: { pipelineId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    if (stage) return stage.id
  }

  // Fallback: primeira pipeline da org → primeiro stage
  const pipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
    select: { id: true },
  })

  if (!pipeline) return null

  const stage = await db.pipelineStage.findFirst({
    where: { pipelineId: pipeline.id },
    orderBy: { position: 'asc' },
    select: { id: true },
  })

  return stage?.id ?? null
}

async function resolveAssignedTo(
  orgId: string,
  distributionUserIds?: string[],
  inboxId?: string,
  salesDistributionModel?: SalesDistributionModel,
  contactCurrentAssignedTo?: string | null,
  squadId?: string | null,
): Promise<string | null> {
  // Squad tem prioridade — usa modelo e membros configurados no squad
  if (squadId) {
    const squadResolution = await resolveSquadMember({
      orgId,
      squadId,
      contactCurrentAssignedTo,
    })
    if (squadResolution) return squadResolution.userId
  }

  const model = salesDistributionModel ?? SalesDistributionModel.ROUND_ROBIN

  if (model === SalesDistributionModel.MANUAL) {
    return null
  }

  if (model === SalesDistributionModel.LOYALTY) {
    if (contactCurrentAssignedTo) return contactCurrentAssignedTo
    return resolveRoundRobin(orgId, distributionUserIds, inboxId)
  }

  if (model === SalesDistributionModel.UTILIZATION) {
    if (distributionUserIds && distributionUserIds.length > 0) {
      return resolveByUtilization(orgId, distributionUserIds)
    }
    return resolveOrgOwner(orgId)
  }

  if (model === SalesDistributionModel.PERFORMANCE_WEIGHTED) {
    console.warn(
      '[resolveConversation] PERFORMANCE_WEIGHTED not implemented, falling back to ROUND_ROBIN',
      { orgId },
    )
  }

  return resolveRoundRobin(orgId, distributionUserIds, inboxId)
}

async function resolveRoundRobin(
  orgId: string,
  distributionUserIds?: string[],
  inboxId?: string,
): Promise<string | null> {
  if (distributionUserIds && distributionUserIds.length > 0 && inboxId) {
    try {
      const counter = await redis.incr(`distribution:${inboxId}:index`)
      const index = (counter - 1) % distributionUserIds.length
      return distributionUserIds[index]
    } catch (error) {
      console.warn(
        '[resolveConversation] Redis INCR failed, using first user:',
        { inboxId, error },
      )
      return distributionUserIds[0]
    }
  }
  return resolveOrgOwner(orgId)
}

async function resolveByUtilization(
  orgId: string,
  userIds: string[],
): Promise<string | null> {
  const openDealCounts = await db.deal.groupBy({
    by: ['assignedTo'],
    where: {
      organizationId: orgId,
      assignedTo: { in: userIds },
      status: 'OPEN',
    },
    _count: { id: true },
  })

  const countMap = new Map(
    openDealCounts.map((row) => [row.assignedTo, row._count.id]),
  )

  let minCount = Infinity
  let selectedUser = userIds[0]

  for (const userId of userIds) {
    const count = countMap.get(userId) ?? 0
    if (count < minCount) {
      minCount = count
      selectedUser = userId
    }
  }

  return selectedUser
}

// Garante que um contato tenha ContactPrivacy. Usado no backfill de contatos legados
// criados antes da feature de privacidade existir. Idempotente: não cria duplicatas.
async function ensureContactPrivacy(
  contactId: string,
  captureChannel: CaptureChannel,
): Promise<void> {
  const hasPrivacy = await db.contactPrivacy.findUnique({
    where: { contactId },
    select: { contactId: true },
  })
  if (hasPrivacy) return
  const { legalBasis, legalBasisSource } =
    CHANNEL_DEFAULT_LEGAL_BASIS[captureChannel]
  await createContactPrivacy(db, {
    contactId,
    legalBasis,
    legalBasisSource,
    performedBy: null,
  })
}

async function resolveOrgOwner(orgId: string): Promise<string | null> {
  const ownerMember = await db.member.findFirst({
    where: {
      organizationId: orgId,
      role: 'OWNER',
      status: 'ACCEPTED',
    },
    select: { userId: true },
  })
  return ownerMember?.userId ?? null
}
