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

/**
 * Atualiza o delivery status de uma mensagem com protecao contra downgrade.
 * Usa updateMany para ser idempotente (nao lanca erro se msg nao existe).
 * O WHERE condicional garante que o status so avanca, nunca retrocede.
 */
export async function updateDeliveryStatus(
  providerMessageId: string,
  newStatus: MessageDeliveryStatus,
): Promise<void> {
  const allowed = getAllowedPreviousStatuses(newStatus)

  await db.message.updateMany({
    where: {
      providerMessageId,
      OR: [
        { deliveryStatus: null },
        { deliveryStatus: { in: allowed } },
      ],
    },
    data: { deliveryStatus: newStatus },
  })
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
): Promise<{ conversationId: string } | null> {
  const message = await db.message.findUnique({
    where: { providerMessageId },
    select: { id: true, metadata: true, conversationId: true },
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

  return { conversationId: message.conversationId }
}
