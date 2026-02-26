/**
 * Quebra texto em chunks para embedding, tentando preservar fronteiras semânticas.
 * Prioridade de quebra: parágrafo (\n\n) > frase (. ) > limite de chars.
 */
export function chunkText(
  text: string,
  maxChars = 2000,
  overlapChars = 200,
): string[] {
  const cleanText = text.replace(/\r\n/g, '\n').trim()

  if (!cleanText) return []
  if (cleanText.length <= maxChars) return [cleanText]

  const chunks: string[] = []
  let start = 0

  while (start < cleanText.length) {
    let end = Math.min(start + maxChars, cleanText.length)

    // Se não chegou no final, tentar quebrar em fronteira semântica
    if (end < cleanText.length) {
      const window = cleanText.slice(start, end)
      const minBreakPoint = Math.floor(maxChars * 0.3)

      // Tentar quebrar no último parágrafo
      const lastParagraph = window.lastIndexOf('\n\n')
      if (lastParagraph > minBreakPoint) {
        end = start + lastParagraph + 2
      } else {
        // Tentar quebrar na última frase
        const lastSentence = window.lastIndexOf('. ')
        if (lastSentence > minBreakPoint) {
          end = start + lastSentence + 2
        }
      }
    }

    const chunk = cleanText.slice(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    // Último chunk — sair do loop
    if (end >= cleanText.length) break

    // Avançar com overlap, garantindo progresso mínimo
    const nextStart = end - overlapChars
    start = Math.max(nextStart, start + 1)
  }

  return chunks
}
