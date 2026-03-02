/**
 * Envia áudio via Evolution API REST.
 * Diferente de sendText, o áudio é enviado inteiro (sem chunking).
 */
export async function sendWhatsAppAudio(
  instanceName: string,
  remoteJid: string,
  audioBase64: string,
): Promise<string> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

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
