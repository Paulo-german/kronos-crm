const MAX_WHATSAPP_MESSAGE_LENGTH = 4000

/**
 * Envia mensagem de texto via Evolution API REST.
 * Quebra automaticamente mensagens longas em chunks para não estourar o limite do WhatsApp.
 */
export async function sendWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  text: string,
): Promise<void> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  const chunks = splitMessage(text, MAX_WHATSAPP_MESSAGE_LENGTH)

  for (const chunk of chunks) {
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
          text: chunk,
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      throw new Error(
        `Evolution API sendText failed (${response.status}): ${errorBody}`,
      )
    }
  }
}

/**
 * Quebra texto longo em chunks respeitando quebras de linha quando possível.
 */
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    // Tenta quebrar na última quebra de linha dentro do limite
    let splitIndex = remaining.lastIndexOf('\n', maxLength)

    // Se não encontrou, tenta no último espaço
    if (splitIndex <= 0) {
      splitIndex = remaining.lastIndexOf(' ', maxLength)
    }

    // Se ainda não encontrou, corta no limite
    if (splitIndex <= 0) {
      splitIndex = maxLength
    }

    chunks.push(remaining.slice(0, splitIndex))
    remaining = remaining.slice(splitIndex).trimStart()
  }

  return chunks
}
