import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import { revalidateConversationCache } from './revalidate-cache'
import type { TriggerHumanHandoffCtx } from './two-phase-types'

/**
 * Pausa a conversa programaticamente, registra event na timeline e notifica
 * os admins/owners da org via in-app.
 *
 * Diferente do tool `hand_off_to_human` (LLM-driven), não envia WhatsApp nem
 * cria activity no deal — é acionada pelo guardrail (§4.4) após o cliente já
 * ter recebido o GENERIC_SAFE_FALLBACK.
 *
 * Ordem crítica: deve ser chamada DEPOIS do envio da mensagem GENERIC_SAFE_FALLBACK
 * ao cliente — nunca antes. Chamar antes pausaria a conversa prematuramente e
 * checkAntiAtropelamento bloquearia o envio, deixando o cliente em silêncio total.
 */
export async function triggerHumanHandoff(ctx: TriggerHumanHandoffCtx): Promise<void> {
  // pausedAt: null → pausa indefinida (auto-unpause NÃO dispara),
  // mesmo padrão do tool hand_off_to_human
  await db.conversation.update({
    where: {
      id: ctx.conversationId,
      organizationId: ctx.organizationId,
    },
    data: {
      aiPaused: true,
      pausedAt: null,
    },
  })

  // Event aparece na timeline do inbox com subtype HAND_OFF_TO_HUMAN para que
  // o atendente entenda o motivo da transferência sem precisar checar logs
  await db.conversationEvent.create({
    data: {
      conversationId: ctx.conversationId,
      type: 'INFO',
      content: ctx.reason,
      metadata: {
        subtype: 'HAND_OFF_TO_HUMAN',
        phaseTraceId: ctx.phaseTraceId,
      } as Prisma.InputJsonValue,
      visibleToUser: true,
    },
  })

  // Notifica todos os admins/owners da org via in-app — o operador precisa saber
  // que a conversa foi escalada pelo guardrail, sem depender de estar olhando o inbox
  await notifyAdminsOfHandoff(ctx)

  // Invalida cache para que a UI reflita imediatamente o estado aiPaused = true
  await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
}

async function notifyAdminsOfHandoff(ctx: TriggerHumanHandoffCtx): Promise<void> {
  const [admins, organization] = await Promise.all([
    db.member.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACCEPTED',
        userId: { not: null },
      },
      select: { userId: true },
    }),
    db.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { slug: true },
    }),
  ])

  if (admins.length === 0) return

  const actionUrl = organization?.slug
    ? `/org/${organization.slug}/inbox?conversationId=${ctx.conversationId}`
    : null

  const eligibleAdmins = admins.filter((admin): admin is { userId: string } => admin.userId !== null)

  const results = await Promise.allSettled(
    eligibleAdmins.map((admin) =>
      db.notification.create({
        data: {
          organizationId: ctx.organizationId,
          userId: admin.userId,
          type: 'SYSTEM',
          title: 'Conversa transferida para atendimento humano',
          body: ctx.reason,
          actionUrl,
          resourceType: 'conversation',
          resourceId: ctx.conversationId,
        },
      }),
    ),
  )

  const succeeded = results.filter((result) => result.status === 'fulfilled').length
  const failed = results.filter((result) => result.status === 'rejected').length

  if (failed > 0) {
    logger.error('triggerHumanHandoff: failed to create some admin notifications', {
      organizationId: ctx.organizationId,
      conversationId: ctx.conversationId,
      succeeded,
      failed,
    })
  }

  logger.info('triggerHumanHandoff: admin notifications sent', {
    organizationId: ctx.organizationId,
    conversationId: ctx.conversationId,
    recipientCount: succeeded,
  })
}
