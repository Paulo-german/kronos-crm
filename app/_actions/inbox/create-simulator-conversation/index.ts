'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import {
  SIMULATOR_CONTACT_PHONE,
  SIMULATOR_DEAL_TITLE,
  SIMULATOR_REMOTE_JID,
} from '@/_lib/simulator'
import { createSimulatorConversationSchema } from './schema'

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

    // 2. Validar que o agente pertence à organização e carregar pipelineIds
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true, isActive: true, pipelineIds: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 3. Resolver primeira stage do primeiro pipeline configurado no agente.
    // Sem pipeline configurado, o simulador segue sem deal — tools de deal falharão
    // como em produção quando a conversa chega sem negociação vinculada.
    const firstStage =
      agent.pipelineIds.length > 0
        ? await db.pipelineStage.findFirst({
            where: {
              pipelineId: agent.pipelineIds[0],
              pipeline: { organizationId: ctx.orgId },
            },
            orderBy: { position: 'asc' },
            select: { id: true },
          })
        : null

    // 4. Buscar ou criar inbox SIMULATOR (singleton por org)
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

    // 5. Buscar ou criar contato virtual para esta org
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

    // 6. Reset: deletar conversa anterior (se existir) junto com o deal simulado antigo.
    // Conversation.dealId tem FK sem cascade, então deletar a conversa deixa o deal órfão —
    // precisamos apagar o deal explicitamente para evitar acúmulo entre simulações.
    const existing = await db.conversation.findFirst({
      where: { inboxId, contactId, channel: 'WHATSAPP' },
      select: { id: true, dealId: true },
    })

    if (existing) {
      await db.conversation.delete({ where: { id: existing.id } })
      if (existing.dealId) {
        await db.deal.delete({ where: { id: existing.dealId } })
      }
    }

    // 7. Criar conversa + deal em transação atômica.
    // Deal só é criado quando o agente tem pipeline configurado.
    const created = await db.$transaction(async (tx) => {
      const newConversation = await tx.conversation.create({
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

      if (!firstStage) {
        return { conversationId: newConversation.id, dealId: null as string | null }
      }

      const newDeal = await tx.deal.create({
        data: {
          organizationId: ctx.orgId,
          title: SIMULATOR_DEAL_TITLE,
          pipelineStageId: firstStage.id,
          assignedTo: ctx.userId,
          contacts: {
            create: { contactId, isPrimary: true, role: '' },
          },
        },
        select: { id: true },
      })

      await tx.conversation.update({
        where: { id: newConversation.id },
        data: { dealId: newDeal.id },
      })

      return { conversationId: newConversation.id, dealId: newDeal.id }
    })

    // 8. Invalidar caches relevantes (inbox + CRM, já que o deal aparece em queries filtradas)
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    // 9. Retornar DTO da conversa para a UI selecionar imediatamente no inbox
    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false
    const dto = await getConversationAsDto(ctx.orgId, created.conversationId, elevated, hidePii)

    return { conversation: dto }
  })
