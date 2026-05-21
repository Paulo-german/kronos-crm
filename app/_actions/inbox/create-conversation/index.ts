'use server'

import { revalidateTag } from 'next/cache'
import { after } from 'next/server'
import { SalesDistributionModel } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import { createDealForNewConversation } from '@/_lib/evolution/resolve-conversation'
import { inferCaptureChannelFromInboxChannel } from '@/_lib/lifecycle/infer-capture-channel'
import { matchCaptureEventToCampaign } from '@/_lib/lifecycle/match-capture-event-to-campaign'
import { createConversationSchema } from './schema'

export const createConversation = orgActionClient
  .schema(createConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'create'))

    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false

    // 2. Validar contato pertence à org e tem telefone
    const contact = await db.contact.findFirst({
      where: { id: data.contactId, organizationId: ctx.orgId },
      select: {
        id: true,
        name: true,
        phone: true,
        assignedTo: true,
        firstCaptureAt: true,
      },
    })

    if (!contact) {
      throw new Error('Contato não encontrado.')
    }

    if (!contact.phone) {
      throw new Error('Contato não possui telefone cadastrado.')
    }

    // 3. Validar inbox pertence à org e está conectada
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        evolutionInstanceName: true,
        metaPhoneNumberId: true,
        zapiInstanceId: true,
        autoCreateDeal: true,
        pipelineId: true,
        distributionUserIds: true,
        squadId: true,
        channel: true,
        captureSourceId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName && !inbox.metaPhoneNumberId && !inbox.zapiInstanceId) {
      throw new Error('Esta caixa não está conectada ao WhatsApp.')
    }

    // 4. Criar conversa (catch unique constraint para race condition)
    // Normalizar telefone: remover non-digits e garantir código do país (55 para BR)
    // Números locais BR têm 10-11 dígitos (DDD + número). Se já tem 12+, assume internacional.
    const digits = contact.phone.replace(/\D/g, '')
    const normalizedPhone = digits.length <= 11 ? `55${digits}` : digits
    const remoteJid = `${normalizedPhone}@s.whatsapp.net`

    let conversation
    try {
      conversation = await db.conversation.create({
        data: {
          inboxId: data.inboxId,
          organizationId: ctx.orgId,
          contactId: data.contactId,
          channel: 'WHATSAPP',
          remoteJid,
          aiPaused: true,
          // Herda responsavel do contato na criacao manual (contato ja existe e pode ter assignedTo)
          assignedTo: contact.assignedTo,
        },
      })
    } catch (error) {
      // Unique constraint violation - conversa já existe (race condition com webhook)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const existing = await db.conversation.findFirst({
          where: {
            inboxId: data.inboxId,
            contactId: data.contactId,
            channel: 'WHATSAPP',
            organizationId: ctx.orgId,
          },
          select: { id: true },
        })

        if (existing) {
          const dto = await getConversationAsDto(ctx.orgId, existing.id, elevated, hidePii)
          revalidateTag(`conversations:${ctx.orgId}`)
          return { conversation: dto }
        }
      }
      throw error
    }

    // 4b. Registrar CaptureEvent (capturedAutomatically=false — conversa criada manualmente)
    // Bloco non-fatal: falha aqui não pode bloquear a criação da conversa
    try {
      if (inbox.captureSourceId) {
        const captureChannel = inferCaptureChannelFromInboxChannel(inbox.channel)
        const captureEvent = await db.captureEvent.create({
          data: {
            contactId: contact.id,
            organizationId: ctx.orgId,
            channel: captureChannel,
            sourceId: inbox.captureSourceId,
            capturedAutomatically: false,
            metadata: {
              conversationId: conversation.id,
              inboxId: inbox.id,
            },
          },
          select: { id: true, createdAt: true },
        })

        const isFirstCapture = contact.firstCaptureAt === null
        await db.contact.update({
          where: { id: contact.id },
          data: {
            ...(isFirstCapture && {
              firstCaptureChannel: captureChannel,
              firstCaptureAt: captureEvent.createdAt,
            }),
            lastCaptureChannel: captureChannel,
            lastCaptureAt: captureEvent.createdAt,
          },
        })

        after(() => matchCaptureEventToCampaign(captureEvent.id, ctx.orgId))
      } else {
        console.warn('[createConversation] Inbox sem captureSourceId — pulando CaptureEvent', {
          inboxId: inbox.id,
          orgId: ctx.orgId,
        })
      }
    } catch (captureError) {
      console.warn('[createConversation] Falha ao registrar CaptureEvent:', {
        orgId: ctx.orgId,
        contactId: contact.id,
        conversationId: conversation.id,
        error: captureError instanceof Error ? captureError.message : String(captureError),
      })
    }

    // 5. Resolver modelo de distribuição da org (default ROUND_ROBIN)
    const org = await db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { salesDistributionModel: true },
    })
    const salesDistributionModel =
      org?.salesDistributionModel ?? SalesDistributionModel.ROUND_ROBIN

    // 6. Criar deal automaticamente (se inbox configurada para isso)
    if (inbox.autoCreateDeal) {
      await createDealForNewConversation(
        ctx.orgId,
        contact.id,
        contact.name,
        conversation.id,
        {
          pipelineId: inbox.pipelineId,
          distributionUserIds: inbox.distributionUserIds,
          inboxId: inbox.id,
          salesDistributionModel,
          contactCurrentAssignedTo: contact.assignedTo,
          squadId: inbox.squadId,
        },
      )
    } else if (!contact.assignedTo) {
      // Criação manual: quem inicia a conversa assume o contato sem dono.
      await db.contact.update({
        where: { id: contact.id },
        data: { assignedTo: ctx.userId },
      })
      await db.conversation.update({
        where: { id: conversation.id },
        data: { assignedTo: ctx.userId },
      })
    }

    // 7. Invalidar caches
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    // 8. Retornar DTO
    const dto = await getConversationAsDto(ctx.orgId, conversation.id, elevated, hidePii)
    return { conversation: dto }
  })
