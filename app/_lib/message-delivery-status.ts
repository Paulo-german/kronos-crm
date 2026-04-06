import type { MessageDeliveryStatus, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'

// Prioridade numerica — so atualiza se novo status tem prioridade maior
const STATUS_PRIORITY: Record<MessageDeliveryStatus, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/**
 * Retorna os status anteriores permitidos para uma transicao.
 * Ex: 'delivered' so pode ser aplicado se o status atual for null ou sent.
 * Isso impede downgrades por webhooks fora de ordem.
 */
function getAllowedPreviousStatuses(newStatus: MessageDeliveryStatus): MessageDeliveryStatus[] {
  const priority = STATUS_PRIORITY[newStatus]
  return (Object.entries(STATUS_PRIORITY) as [MessageDeliveryStatus, number][])
    .filter(([, p]) => p < priority)
    .map(([status]) => status)
}

interface DeliveryStatusResult {
  conversationId: string
  organizationId: string
}

/**
 * Atualiza o delivery status de uma mensagem com protecao contra downgrade.
 * O WHERE condicional garante que o status so avanca, nunca retrocede.
 * Retorna conversationId/orgId para invalidacao de cache, ou null se msg nao encontrada ou status nao avancou.
 */
export async function updateDeliveryStatus(
  providerMessageId: string,
  newStatus: MessageDeliveryStatus,
): Promise<DeliveryStatusResult | null> {
  const allowed = getAllowedPreviousStatuses(newStatus)

  const result = await db.message.updateMany({
    where: {
      providerMessageId,
      OR: [
        { deliveryStatus: null },
        { deliveryStatus: { in: allowed } },
      ],
    },
    data: { deliveryStatus: newStatus },
  })

  // Nenhuma mensagem atualizada — msg nao existe ou status nao avancou
  if (result.count === 0) return null

  const message = await db.message.findUnique({
    where: { providerMessageId },
    select: {
      conversationId: true,
      conversation: { select: { organizationId: true } },
    },
  })

  if (!message) return null

  return {
    conversationId: message.conversationId,
    organizationId: message.conversation.organizationId,
  }
}

interface DeliveryError {
  code?: number
  title?: string
  message?: string
}

/**
 * Atualiza status para 'failed' com merge de detalhes do erro no metadata.
 * Retorna o conversationId para invalidacao de cache, ou null se msg nao encontrada.
 * Failed sempre sobrescreve qualquer status anterior (prioridade maxima).
 */
export async function updateDeliveryStatusFailed(
  providerMessageId: string,
  error?: DeliveryError,
): Promise<{ conversationId: string; organizationId: string } | null> {
  const message = await db.message.findUnique({
    where: { providerMessageId },
    select: {
      id: true,
      metadata: true,
      conversationId: true,
      conversation: { select: { organizationId: true } },
    },
  })

  if (!message) return null

  const currentMeta = (message.metadata as Record<string, unknown>) ?? {}
  const updatedMeta = error
    ? { ...currentMeta, deliveryError: error }
    : currentMeta

  await db.message.update({
    where: { id: message.id },
    data: {
      deliveryStatus: 'failed',
      metadata: updatedMeta as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    conversationId: message.conversationId,
    organizationId: message.conversation.organizationId,
  }
}
