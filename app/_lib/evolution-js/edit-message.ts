import type { EvolutionCredentials } from './resolve-credentials'

/**
 * Edita uma mensagem de texto já enviada via Evolution API.
 * O provider identifica a mensagem pelo key.id (providerMessageId) e substitui o conteúdo.
 */
export async function editWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  providerMessageId: string,
  newText: string,
  credentials: EvolutionCredentials,
): Promise<void> {
  const { apiUrl, apiKey } = credentials

  const response = await fetch(
    `${apiUrl}/chat/updateMessage/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: newText,
        key: { remoteJid, fromMe: true, id: providerMessageId },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Evolution API editMessage failed (${response.status}): ${errorBody}`)
  }
}
