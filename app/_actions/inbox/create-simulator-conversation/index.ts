'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import { createSimulatorConversationSchema } from './schema'

// JID fictício — nunca enviado para provider externo, apenas identifica a conversa no banco
const SIMULATOR_REMOTE_JID = 'simulator@s.whatsapp.net'

// Número virtual que identifica o contato simulador dentro de uma org
const SIMULATOR_CONTACT_PHONE = 'simulator'

export const createSimulatorConversation = orgActionClient
  .schema(createSimulatorConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Guard adicional: apenas super admins podem usar o simulador.
    // Usamos orgActionClient (não superAdminActionClient) porque precisamos de ctx.orgId e ctx.userRole.
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isSuperAdmin: true },
    })

    if (!user?.isSuperAdmin) {
      throw new Error('Acesso negado.')
    }

    // 1. RBAC: verificar permissão de criação de conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'create'))

    // 2. Validar que o agente pertence à organização
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true, isActive: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 3. Buscar ou criar inbox SIMULATOR (singleton por org)
    let inbox = await db.inbox.findFirst({
      where: { organizationId: ctx.orgId, connectionType: 'SIMULATOR' },
      select: { id: true, agentId: true },
    })

    if (!inbox) {
      inbox = await db.inbox.create({
        data: {
          organizationId: ctx.orgId,
          name: 'Simulador',
          channel: 'WHATSAPP',
          connectionType: 'SIMULATOR',
          agentId: data.agentId,
        },
        select: { id: true, agentId: true },
      })
    } else if (inbox.agentId !== data.agentId) {
      // Atualizar o agente quando o usuário escolhe um diferente para simular
      await db.inbox.update({
        where: { id: inbox.id },
        data: { agentId: data.agentId },
      })
    }

    const inboxId = inbox.id

    // 4. Buscar ou criar contato virtual para esta org
    let contact = await db.contact.findFirst({
      where: { organizationId: ctx.orgId, phone: SIMULATOR_CONTACT_PHONE },
      select: { id: true },
    })

    if (!contact) {
      contact = await db.contact.create({
        data: {
          organizationId: ctx.orgId,
          name: 'Você (Simulador)',
          phone: SIMULATOR_CONTACT_PHONE,
          assignedTo: ctx.userId,
        },
        select: { id: true },
      })
    }

    const contactId = contact.id

    // 5. Tentar criar conversa nova (sempre começa limpa para simulação)
    // Se a conversa já existe (@@unique [inboxId, contactId, channel]), deletar a antiga e recriar.
    // Simulação é descartável — reset garante estado limpo para cada sessão.
    let conversation
    try {
      conversation = await db.conversation.create({
        data: {
          inboxId,
          organizationId: ctx.orgId,
          contactId,
          channel: 'WHATSAPP',
          remoteJid: SIMULATOR_REMOTE_JID,
          aiPaused: false,
          assignedTo: ctx.userId,
        },
        select: { id: true },
      })
    } catch (error) {
      const isPrismaUniqueViolation =
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'

      if (!isPrismaUniqueViolation) throw error

      // Conversa prévia existe — deletar com cascata (mensagens e eventos)
      // e recriar para garantir estado limpo
      const existing = await db.conversation.findFirst({
        where: { inboxId, contactId, channel: 'WHATSAPP' },
        select: { id: true },
      })

      if (existing) {
        await db.conversation.delete({ where: { id: existing.id } })
      }

      conversation = await db.conversation.create({
        data: {
          inboxId,
          organizationId: ctx.orgId,
          contactId,
          channel: 'WHATSAPP',
          remoteJid: SIMULATOR_REMOTE_JID,
          aiPaused: false,
          assignedTo: ctx.userId,
        },
        select: { id: true },
      })
    }

    // 6. Invalidar caches relevantes
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    // 7. Retornar DTO da conversa para a UI selecionar imediatamente no inbox
    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false
    const dto = await getConversationAsDto(ctx.orgId, conversation.id, elevated, hidePii)

    return { conversation: dto }
  })
