import { zapiPost } from './zapi-client'
import type { ZApiConfig } from './types'

/**
 * Edita uma mensagem de texto já enviada via Z-API.
 * O campo editMessageId referencia o providerMessageId da mensagem original.
 */
export async function editZApiTextMessage(
  config: ZApiConfig,
  recipientPhone: string,
  providerMessageId: string,
  newText: string,
): Promise<void> {
  const response = await zapiPost(config, 'send-text', {
    phone: recipientPhone,
    message: newText,
    editMessageId: providerMessageId,
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Z-API editMessage failed (${response.status}): ${errorBody}`)
  }
}
