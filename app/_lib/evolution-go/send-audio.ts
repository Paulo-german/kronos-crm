import { assertEvolutionGoConnected } from './connection-guard'
import type { EvolutionGoCredentials } from './types'

/**
 * Envia áudio via Evolution Go.
 * Endpoint assumido: POST /message/sendAudio
 * TODO: confirmar shape final do payload com a doc oficial Go.
 */
export async function sendEvolutionGoAudio(
  instanceName: string,
  remoteJid: string,
  audioBase64: string,
  credentials: EvolutionGoCredentials,
): Promise<string> {
  const { apiUrl, apiToken } = credentials

  await assertEvolutionGoConnected(instanceName, credentials)

  const response = await fetch(`${apiUrl}/message/sendAudio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiToken,
    },
    body: JSON.stringify({
      instanceName,
      number: remoteJid,
      audio: audioBase64,
      encoding: true,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution Go sendAudio failed (${response.status}): ${errorBody}`,
    )
  }

  const data = await response.json().catch(() => null)
  const messageId = data?.key?.id as string | undefined

  if (!messageId) {
    throw new Error('Evolution Go sendAudio: no messageId returned')
  }

  return messageId
}
