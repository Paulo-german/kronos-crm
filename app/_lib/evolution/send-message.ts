import { splitIntoParagraphs } from '@/_lib/whatsapp/chunk-text'

const MAX_WHATSAPP_MESSAGE_LENGTH = 4000
const DELAY_BETWEEN_CHUNKS_MS = 800

/**
 * Envia mensagem de texto via Evolution API REST.
 * Quebra em parágrafos (\n\n) para simular conversa natural.
 * Parágrafos que excedem 4000 chars são subdivididos.
 */
export async function sendWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  text: string,
): Promise<string[]> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  const chunks = splitIntoParagraphs(text, MAX_WHATSAPP_MESSAGE_LENGTH)
  const messageIds: string[] = []

  for (let index = 0; index < chunks.length; index++) {
    // Entre chunks: "digitando..." + delay para simular conversa natural
    if (index > 0) {
      await sendPresence(instanceName, remoteJid, 'composing')
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS))
    }

    const response = await fetch(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: remoteJid,
          text: chunks[index],
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')

      // Detectar número inexistente no WhatsApp (exists: false)
      if (response.status === 400) {
        try {
          const parsed = JSON.parse(errorBody)
          const msg = parsed?.response?.message
          if (Array.isArray(msg) && msg.some((entry: { exists?: boolean }) => entry.exists === false)) {
            throw new Error('Este número não possui WhatsApp. Verifique o telefone do contato.')
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('não possui WhatsApp')) {
            throw parseError
          }
        }
      }

      throw new Error(
        `Evolution API sendText failed (${response.status}): ${errorBody}`,
      )
    }

    const data = await response.json().catch(() => null)
    const messageId = data?.key?.id as string | undefined
    if (messageId) messageIds.push(messageId)
  }

  return messageIds
}

/**
 * Envia indicador de presença (typing) via Evolution API.
 * Best-effort: falha é silenciosa para não bloquear o fluxo principal.
 */
export async function sendPresence(
  instanceName: string,
  remoteJid: string,
  presence: 'composing' | 'paused' = 'composing',
): Promise<void> {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL
    const apiKey = process.env.EVOLUTION_API_KEY

    if (!apiUrl || !apiKey) return

    await fetch(
      `${apiUrl}/chat/updatePresence/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: remoteJid,
          presence,
        }),
      },
    )
  } catch {
    // Best-effort: nunca lança erro
  }
}
