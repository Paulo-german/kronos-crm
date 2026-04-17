'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import {
  SIMULATOR_DEAL_TITLE,
  SIMULATOR_REMOTE_JID,
} from '@/_lib/simulator'
import { resetSimulatorConversationSchema } from './schema'

export const resetSimulatorConversation = orgActionClient
  .schema(resetSimulatorConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Guard: apenas super admins podem operar o simulador.
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isSuperAdmin: true },
    })

    if (!user?.isSuperAdmin) {
      throw new Error('Acesso negado.')
    }

    requirePermission(canPerformAction(ctx, 'conversation', 'create'))

    // Carrega conversa e inbox; valida que é de fato uma conversa simulada.
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
      select: {
        id: true,
        contactId: true,
        dealId: true,
        inbox: {
          select: {
            id: true,
            agentId: true,
            connectionType: true,
            agent: { select: { pipelineIds: true } },
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    if (conversation.inbox.connectionType !== 'SIMULATOR') {
      throw new Error('Esta action é exclusiva para conversas simuladas.')
    }

    const inboxId = conversation.inbox.id
    const contactId = conversation.contactId

    // Resolve primeira stage do primeiro pipeline do agente (se houver).
    const pipelineIds = conversation.inbox.agent?.pipelineIds ?? []
    const firstStage =
      pipelineIds.length > 0
        ? await db.pipelineStage.findFirst({
            where: {
              pipelineId: pipelineIds[0],
              pipeline: { organizationId: ctx.orgId },
            },
            orderBy: { position: 'asc' },
            select: { id: true },
          })
        : null

    // Delete conversa atual (cascade em messages + events) e deal (FK Restrict — explícito).
    await db.conversation.delete({ where: { id: conversation.id } })
    if (conversation.dealId) {
      await db.deal.delete({ where: { id: conversation.dealId } })
    }

    // Recria conversa + deal em transação atômica.
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
        return { conversationId: newConversation.id }
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

      return { conversationId: newConversation.id }
    })

    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${conversation.id}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false
    const dto = await getConversationAsDto(ctx.orgId, created.conversationId, elevated, hidePii)

    return { conversation: dto }
  })
