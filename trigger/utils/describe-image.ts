import { generateText } from 'ai'
import { observe } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai'
import { langfuseTracer } from '../lib/langfuse'

export const IMAGE_MODEL = 'openai/gpt-4o-mini'

export interface VisionResult {
  text: string
  totalTokens: number
}

/**
 * Função pura de vision: monta data URL e chama gpt-4o-mini para descrever a imagem.
 * Retorna texto + totalTokens para cálculo de créditos.
 */
export async function describeImageWithVision(
  base64: string,
  mimetype: string,
  caption?: string,
): Promise<VisionResult> {
  return observe(async () => {
    const captionContext = caption
      ? `\nO cliente enviou esta imagem com a seguinte legenda: "${caption}". Use isso como contexto adicional.`
      : ''

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
      maxOutputTokens: 1024,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'image-transcription',
        metadata: { model: IMAGE_MODEL },
      },
    })

    const text = result.text || 'Não foi possível descrever a imagem.'
    const totalTokens = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)

    return { text, totalTokens }
  }, { name: 'image-transcription' })()
}
