// 8000 chars ~ 2000 tokens — contexto amplo sem estourar o histórico do LLM
const MAX_PDF_CHARS = 8_000

export const PDF_NO_TEXT_EXTRACTED = '__PDF_NO_TEXT__'

/**
 * Extrai texto de um PDF a partir de base64.
 * Retorna `PDF_NO_TEXT_EXTRACTED` se o PDF não contém texto extraível
 * (ex: escaneado), sinalizando que precisa de fallback via vision AI.
 */
export async function extractPdfText(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64')
  const pdfParse = (await import('pdf-parse')).default
  const pdfData = await pdfParse(buffer)

  const text = pdfData.text?.trim()

  if (!text) {
    return PDF_NO_TEXT_EXTRACTED
  }

  if (text.length > MAX_PDF_CHARS) {
    return text.slice(0, MAX_PDF_CHARS) + '\n[... texto truncado]'
  }

  return text
}
