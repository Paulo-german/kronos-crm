// -----------------------------------------------------------------------------
// Modulo compartilhado de chunking de texto para envio WhatsApp
// Extraido de app/_lib/evolution/send-message.ts para reutilizacao entre providers
// -----------------------------------------------------------------------------

/**
 * Subdivide texto longo respeitando quebras de linha e espacos.
 */
function splitLongText(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength)

    if (splitIndex <= 0) {
      splitIndex = remaining.lastIndexOf(' ', maxLength)
    }

    if (splitIndex <= 0) {
      splitIndex = maxLength
    }

    chunks.push(remaining.slice(0, splitIndex))
    remaining = remaining.slice(splitIndex).trimStart()
  }

  return chunks
}

/**
 * Quebra texto em paragrafos (\n\n) para envio natural no WhatsApp.
 * Paragrafos que excedem maxLength sao subdivididos por \n ou espaco.
 */
export function splitIntoParagraphs(text: string, maxLength: number): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (trimmed.length <= maxLength) {
      chunks.push(trimmed)
    } else {
      chunks.push(...splitLongText(trimmed, maxLength))
    }
  }

  // Se nao gerou nenhum chunk (texto vazio), retorna o texto original
  return chunks.length > 0 ? chunks : [text]
}
