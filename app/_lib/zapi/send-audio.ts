import { zapiPost } from './zapi-client'
import { assertZApiConnected } from './instance-info'
import type { ZApiConfig, ZApiSendResponse } from './types'

/**
 * Envia audio via Z-API.
 * Z-API aceita base64 diretamente no campo `audio`.
 */
export async function sendZApiAudio(
  config: ZApiConfig,
  recipientPhone: string,
  audioBase64: string,
): Promise<string> {
  await assertZApiConnected(config)

  const response = await zapiPost(config, 'send-audio', {
    phone: recipientPhone,
    audio: audioBase64,
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Z-API sendAudio failed (${response.status}): ${errorBody}`,
    )
  }

  const data: ZApiSendResponse = await response.json()

  if (!data.messageId) {
    throw new Error('Z-API sendAudio: no messageId returned')
  }

  return data.messageId
}
