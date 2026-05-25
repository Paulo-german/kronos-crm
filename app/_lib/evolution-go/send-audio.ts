import { assertEvolutionGoConnected } from './connection-guard'
import { extractMessageId } from './send-message'
import type { EvolutionGoCredentials } from './types'

// Áudio usa POST /send/media com type: "audio"
export async function sendEvolutionGoAudio(
  instanceName: string,
  remoteJid: string,
  audioBase64: string,
  credentials: EvolutionGoCredentials,
): Promise<string> {
  const { apiUrl, apiToken } = credentials

  await assertEvolutionGoConnected(instanceName, credentials)

  const response = await fetch(`${apiUrl}/send/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiToken },
    body: JSON.stringify({
      number: remoteJid,
      type: 'audio',
      url: audioBase64,
      formatJid: true,
      delay: 0,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Evolution Go sendAudio failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json().catch(() => null)
  return extractMessageId(data) ?? ''
}
