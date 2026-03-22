import { splitIntoParagraphs } from '@/_lib/whatsapp/chunk-text'
import { zapiPost } from './zapi-client'
import { assertZApiConnected } from './instance-info'
import type { ZApiConfig, ZApiSendResponse } from './types'

const MAX_WHATSAPP_MESSAGE_LENGTH = 4000
const DELAY_BETWEEN_CHUNKS_MS = 800

/**
 * Envia mensagem de texto via Z-API.
 * Quebra em paragrafos para simular conversa natural (mesmo padrao da Evolution).
 */
export async function sendZApiTextMessage(
  config: ZApiConfig,
  recipientPhone: string,
  text: string,
): Promise<string[]> {
  await assertZApiConnected(config)

  const chunks = splitIntoParagraphs(text, MAX_WHATSAPP_MESSAGE_LENGTH)
  const messageIds: string[] = []

  for (let index = 0; index < chunks.length; index++) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS))
    }

    const response = await zapiPost(config, 'send-text', {
      phone: recipientPhone,
      message: chunks[index],
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(
        `Z-API sendText failed (${response.status}): ${errorBody}`,
      )
    }

    const data: ZApiSendResponse = await response.json()
    if (data.messageId) messageIds.push(data.messageId)
  }

  return messageIds
}
