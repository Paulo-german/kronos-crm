import { generateText } from 'ai'
import { observe } from '@langfuse/tracing'
import { getModel } from '@/_lib/ai'
import { langfuseTracer } from '../lib/langfuse'
import type { VisionResult } from './describe-image'

const PDF_MODEL = 'openai/gpt-4o-mini'

/**
 * Envia um PDF escaneado (sem texto extraível) para gpt-4o-mini
 * que interpreta as páginas visualmente e extrai o conteúdo.
 */
export async function describePdfWithVision(base64: string): Promise<VisionResult> {
  return observe(async () => {
    const dataUrl = `data:application/pdf;base64,${base64}`

    const result = await generateText({
      model: getModel(PDF_MODEL),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: dataUrl,
              mediaType: 'application/pdf',
            },
            {
              type: 'text',
              text: 'Este PDF contém imagens ou texto escaneado. Extraia e transcreva TODO o conteúdo visível: textos, valores, tabelas, títulos, rodapés. Se houver preços, condições comerciais ou dados de contato, destaque-os. Responda em português.',
            },
          ],
        },
      ],
      maxOutputTokens: 2048,
      experimental_telemetry: {
        isEnabled: true,
        tracer: langfuseTracer,
        functionId: 'pdf-vision-transcription',
        metadata: { model: PDF_MODEL },
      },
    })

    const text = result.text || 'Não foi possível extrair conteúdo do PDF.'
    const totalTokens = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0)

    return { text, totalTokens }
  }, { name: 'pdf-vision-transcription' })()
}
