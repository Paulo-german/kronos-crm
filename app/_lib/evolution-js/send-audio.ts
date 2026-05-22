import { assertEvolutionConnected } from './connection-guard'
import type { EvolutionCredentials } from './resolve-credentials'

/**
 * Envia áudio via Evolution API REST.
 * Diferente de sendText, o áudio é enviado inteiro (sem chunking).
 */
export async function sendWhatsAppAudio(
  instanceName: string,
  remoteJid: string,
  audioBase64: string,
  credentials: EvolutionCredentials,
): Promise<string> {
  const { apiUrl, apiKey } = credentials

  await assertEvolutionConnected(instanceName, credentials)

  const response = await fetch(
    `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        audio: audioBase64,
        encoding: true,
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution API sendWhatsAppAudio failed (${response.status}): ${errorBody}`,
    )
  }

  const data = await response.json().catch(() => null)
  const messageId = data?.key?.id as string | undefined

  if (!messageId) {
    throw new Error('Evolution API sendWhatsAppAudio: no messageId returned')
  }

  return messageId
}
