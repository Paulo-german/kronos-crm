import { db } from '@/_lib/prisma'

interface ResolveResult {
  conversationId: string
  isNew: boolean
}

/**
 * Busca ou cria Conversation + Contact para um número de WhatsApp.
 * Usado pelo webhook quando é o primeiro contato de um remoteJid com a Inbox.
 */
export async function resolveConversation(
  inboxId: string,
  orgId: string,
  remoteJid: string,
  phoneNumber: string,
  pushName: string | null,
): Promise<ResolveResult> {
  // 1. Buscar conversa existente
  const existing = await db.conversation.findFirst({
    where: { inboxId, remoteJid },
    select: { id: true },
  })

  if (existing) {
    return { conversationId: existing.id, isNew: false }
  }

  // 2. Buscar ou criar Contact pelo telefone na org
  let contact = await db.contact.findFirst({
    where: { organizationId: orgId, phone: phoneNumber },
    select: { id: true },
  })

  if (!contact) {
    contact = await db.contact.create({
      data: {
        organizationId: orgId,
        name: pushName || phoneNumber,
        phone: phoneNumber,
      },
      select: { id: true },
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

  return { conversationId: conversation.id, isNew: true }
}
