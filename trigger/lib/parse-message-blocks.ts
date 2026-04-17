interface TextBlock {
  type: 'text'
  content: string
}

interface MediaBlock {
  type: 'media'
  url: string
  mediaType: 'image' | 'video' | 'document'
  caption?: string
}

export type MessageBlock = TextBlock | MediaBlock

// Mapeamento extensão → mediaType. A chave é a extensão sem ponto, em minúsculas.
const EXTENSION_TO_MEDIA_TYPE: Record<string, 'image' | 'video' | 'document'> =
  {
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    webp: 'image',
    gif: 'image',
    mp4: 'video',
    pdf: 'document',
    doc: 'document',
    docx: 'document',
  }

// Detecta se uma string é EXATAMENTE uma URL (nada mais na linha além de whitespace).
// Aceita http:// e https://.
const ISOLATED_URL_REGEX = /^https?:\/\/\S+$/

/**
 * Extrai a extensão da URL ignorando query params e fragmentos.
 * Retorna a extensão em minúsculas sem ponto, ou null se não houver.
 *
 * Exemplo: "https://cdn.example.com/foto.JPG?v=2" → "jpg"
 */
function extractExtension(url: string): string | null {
  // Descarta query string e fragmento antes de analisar o pathname.
  const withoutQuery = url.split('?')[0].split('#')[0]
  const lastSegment = withoutQuery.split('/').pop() ?? ''
  const dotIndex = lastSegment.lastIndexOf('.')

  if (dotIndex === -1 || dotIndex === lastSegment.length - 1) return null

  return lastSegment.slice(dotIndex + 1).toLowerCase()
}

/**
 * Resolve se uma linha isolada é um bloco de mídia.
 * Retorna MediaBlock quando a linha é uma URL sozinha com extensão reconhecida,
 * ou null quando deve ser tratada como texto comum.
 */
function resolveMediaBlock(trimmedLine: string): MediaBlock | null {
  if (!ISOLATED_URL_REGEX.test(trimmedLine)) return null

  const extension = extractExtension(trimmedLine)
  if (extension === null) return null

  const mediaType = EXTENSION_TO_MEDIA_TYPE[extension]
  if (mediaType === undefined) return null

  return { type: 'media', url: trimmedLine, mediaType }
}

/**
 * Divide a mensagem final do Agent 2 em blocos sequenciais de texto e mídia.
 *
 * Contrato:
 * - URL isolada na linha + extensão reconhecida → MediaBlock
 * - Qualquer outra linha (texto, URL inline, URL sem extensão de mídia) → agrupa em TextBlock
 * - Linhas consecutivas de texto (incluindo vazias entre elas) são unidas em um único TextBlock
 * - Mensagem vazia → []
 */
export function parseMessageBlocks(message: string): MessageBlock[] {
  if (message.length === 0) return []

  const lines = message.split('\n')
  const blocks: MessageBlock[] = []

  // Buffer acumula linhas de texto consecutivas para unificá-las em um único TextBlock.
  let textBuffer: string[] = []

  const flushTextBuffer = () => {
    if (textBuffer.length === 0) return
    blocks.push({ type: 'text', content: textBuffer.join('\n') })
    textBuffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const mediaBlock = resolveMediaBlock(trimmed)

    if (mediaBlock !== null) {
      // Fecha qualquer texto acumulado antes de emitir o bloco de mídia.
      flushTextBuffer()
      blocks.push(mediaBlock)
      continue
    }

    // Linha de texto comum (inclui URLs inline e URLs sem extensão de mídia).
    textBuffer.push(line)
  }

  // Emite o buffer restante caso a mensagem termine com texto.
  flushTextBuffer()

  return blocks
}
