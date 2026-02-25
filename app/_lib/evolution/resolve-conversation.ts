import { db } from '@/_lib/prisma'

interface ResolveResult {
  conversationId: string
  isNew: boolean
}

/**
 * Busca ou cria AgentConversation + Contact para um número de WhatsApp.
 * Usado pelo webhook quando é o primeiro contato de um remoteJid com o Agent.
 */
export async function resolveConversation(
  agentId: string,
  orgId: string,
  remoteJid: string,
  phoneNumber: string,
  pushName: string | null,
): Promise<ResolveResult> {
  // 1. Buscar conversa existente
  const existing = await db.agentConversation.findFirst({
    where: { agentId, remoteJid },
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

  // 3. Criar AgentConversation
  const conversation = await db.agentConversation.create({
    data: {
      agentId,
      organizationId: orgId,
      contactId: contact.id,
      channel: 'WHATSAPP',
      remoteJid,
    },
    select: { id: true },
  })

  return { conversationId: conversation.id, isNew: true }
}
