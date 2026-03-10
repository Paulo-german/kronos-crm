import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'

interface DealCreationContext {
  pipelineId: string | null
  distributionUserIds: string[]
  inboxId: string
}

interface ContactAssignContext {
  distributionUserIds: string[]
  inboxId: string
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
): Promise<ResolveResult> {
  // 1. Buscar conversa existente
  const existing = await db.conversation.findFirst({
    where: { inboxId, remoteJid },
    select: { id: true },
  })

  if (existing) {
    // Atualizar nome do contato na primeira resposta inbound (quando nome é placeholder)
    if (!fromMe && pushName) {
      const contact = await db.contact.findFirst({
        where: { organizationId: orgId, phone: phoneNumber },
        select: { id: true, name: true },
      })

      if (contact && contact.name === phoneNumber) {
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
  const effectiveName = fromMe ? phoneNumber : (pushName || phoneNumber)

  let contact = await db.contact.findFirst({
    where: { organizationId: orgId, phone: phoneNumber },
    select: { id: true, name: true },
  })

  const isNewContact = !contact

  if (!contact) {
    contact = await db.contact.create({
      data: {
        organizationId: orgId,
        name: effectiveName,
        phone: phoneNumber,
      },
      select: { id: true, name: true },
    })
  }

  // 3. Criar Conversation
  const conversation = await db.conversation.create({
    data: {
      inboxId,
      organizationId: orgId,
      contactId: contact.id,
      channel: 'WHATSAPP',
      remoteJid,
    },
    select: { id: true },
  })

  // 4. Criar Deal automaticamente para nova conversa (se dealContext presente)
  if (dealContext) {
    await createDealForNewConversation(
      orgId,
      contact.id,
      contact.name,
      conversation.id,
      dealContext,
    )
  } else if (isNewContact && contactAssignContext) {
    // Sem deal, mas atribuir contact ao round-robin
    await assignContactOwner(orgId, contact.id, contactAssignContext)
  }

  return { conversationId: conversation.id, isNew: true }
}

export async function assignContactOwner(
  orgId: string,
  contactId: string,
  context: ContactAssignContext,
): Promise<void> {
  try {
    const assignedTo = await resolveAssignedTo(orgId, context.distributionUserIds, context.inboxId)
    if (!assignedTo) return

    await db.contact.updateMany({
      where: { id: contactId, assignedTo: null },
      data: { assignedTo },
    })
  } catch (error) {
    console.warn('[resolveConversation] Falha ao atribuir contact:', { orgId, contactId, error })
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
    const firstStageId = await resolveFirstStageId(orgId, dealContext.pipelineId)
    if (!firstStageId) {
      console.warn('[resolveConversation] Nenhum stage encontrado para criar deal', { orgId })
      return
    }

    // 2. Resolver assignedTo via round-robin
    const assignedTo = await resolveAssignedTo(
      orgId,
      dealContext.distributionUserIds,
      dealContext.inboxId,
    )
    if (!assignedTo) {
      console.warn('[resolveConversation] Nenhum assignee encontrado para criar deal', { orgId })
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
          contacts: {
            create: {
              contactId,
              isPrimary: true,
            },
          },
        },
      })

      await tx.conversation.update({
        where: { id: conversationId },
        data: { dealId: deal.id },
      })

      // Atribuir contact ao mesmo dono do deal (apenas se não tem dono)
      await tx.contact.updateMany({
        where: { id: contactId, assignedTo: null },
        data: { assignedTo },
      })
    })
  } catch (error) {
    // Deal é opcional — não deve bloquear a criação da conversa
    console.warn('[resolveConversation] Falha ao criar deal automático:', { orgId, conversationId, error })
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
): Promise<string | null> {
  // Round-robin: usar Redis counter atômico
  if (distributionUserIds && distributionUserIds.length > 0 && inboxId) {
    try {
      const counter = await redis.incr(`distribution:${inboxId}:index`)
      const index = (counter - 1) % distributionUserIds.length
      return distributionUserIds[index]
    } catch (error) {
      console.warn('[resolveConversation] Redis INCR failed, using first user:', { inboxId, error })
      return distributionUserIds[0]
    }
  }

  // Fallback: OWNER da org
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
