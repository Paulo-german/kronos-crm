'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import { createConversationSchema } from './schema'

export const createConversation = orgActionClient
  .schema(createConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'create'))

    // 2. Validar contato pertence à org e tem telefone
    const contact = await db.contact.findFirst({
      where: { id: data.contactId, organizationId: ctx.orgId },
      select: { id: true, phone: true },
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
      select: { id: true, evolutionInstanceName: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
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
          const dto = await getConversationAsDto(ctx.orgId, existing.id)
          revalidateTag(`conversations:${ctx.orgId}`)
          return { conversation: dto }
        }
      }
      throw error
    }

    // 5. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)

    // 6. Retornar DTO
    const dto = await getConversationAsDto(ctx.orgId, conversation.id)
    return { conversation: dto }
  })
