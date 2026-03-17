import { generateText } from 'ai'
import { observe } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai'
import { langfuseTracer } from '../lib/langfuse'

interface EvolutionBase64Response {
  mediaType: string
  mimetype: string
  base64: string
}

const IMAGE_MODEL = 'openai/gpt-4o-mini'

/**
 * Busca a imagem via Evolution API (getBase64FromMediaMessage) e descreve com gpt-4o-mini.
 *
 * Aceita opcionalmente o base64 já baixado (evita chamada dupla à Evolution API
 * quando downloadAndStoreMedia já foi executado antes).
 */
export async function transcribeImage(
  instanceName: string,
  messageId: string,
  caption?: string,
  preloadedBase64?: { base64: string; mimetype: string },
): Promise<string> {
  return observe(async () => {
    let base64: string
    let mimetype: string

    if (preloadedBase64) {
      base64 = preloadedBase64.base64
      mimetype = preloadedBase64.mimetype
    } else {
      const apiUrl = process.env.EVOLUTION_API_URL
      const apiKey = process.env.EVOLUTION_API_KEY

      if (!apiUrl || !apiKey) {
        throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
      }

      const response = await fetch(
        `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            message: {
              key: { id: messageId },
            },
          }),
        },
      )

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown')
        throw new Error(
          `Evolution getBase64FromMediaMessage failed (${response.status}): ${errorBody}`,
        )
      }

      const data: EvolutionBase64Response = await response.json()

      if (!data.base64) {
        throw new Error('Evolution returned empty base64 for image message')
      }

      base64 = data.base64
      mimetype = data.mimetype ?? 'image/jpeg'
    }

    // Montar prompt com contexto opcional da legenda
    const captionContext = caption
      ? `\nO cliente enviou esta imagem com a seguinte legenda: "${caption}". Use isso como contexto adicional.`
      : ''

    // Enviar para gpt-4o-mini via OpenRouter com conteúdo multipart
    const dataUrl = `data:${mimetype};base64,${base64}`

    const result = await generateText({
      model: getModel(IMAGE_MODEL),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: dataUrl,
            },
            {
              type: 'text',
              text: `Descreva esta imagem de forma objetiva e detalhada em português. Inclua: objetos visíveis, pessoas (sem identificar), textos legíveis, cores predominantes e contexto geral da cena. Se houver texto na imagem (print de tela, documento, etc.), transcreva-o na íntegra.${captionContext}`,
            },
          ],
        },
      ],
      maxOutputTokens: 512,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'image-transcription',
        metadata: { model: IMAGE_MODEL, messageId },
      },
    })

    return result.text || 'Não foi possível descrever a imagem.'
  }, { name: 'image-transcription' })()
}
