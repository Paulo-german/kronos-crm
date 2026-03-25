'use client'

interface TextSegment {
  text: string
  isMatch: boolean
}

interface HighlightTextProps {
  text: string
  query: string
}

/**
 * Remove acentos de uma string para comparação accent-insensitive.
 * Equivalente client-side do unaccent() do Postgres.
 */
function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Divide a query em tokens (palavras) para highlight AND.
 * Replica a lógica do tokenizeQuery do backend (server-only).
 */
function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

/**
 * Constrói os segmentos de texto com marcação de match para todos os tokens.
 * Cada token pode dar match em qualquer posição do texto.
 */
function buildSegments(text: string, tokens: string[]): TextSegment[] {
  if (tokens.length === 0) {
    return [{ text, isMatch: false }]
  }

  const normalizedText = removeAccents(text)

  // Encontra todos os intervalos [start, end] que fazem match com algum token
  const matchRanges: Array<{ start: number; end: number }> = []

  for (const token of tokens) {
    const normalizedToken = removeAccents(token)
    let searchFrom = 0

    while (searchFrom < normalizedText.length) {
      const matchIndex = normalizedText
        .toLowerCase()
        .indexOf(normalizedToken, searchFrom)

      if (matchIndex === -1) break

      matchRanges.push({
        start: matchIndex,
        end: matchIndex + normalizedToken.length,
      })
      searchFrom = matchIndex + 1
    }
  }

  if (matchRanges.length === 0) {
    return [{ text, isMatch: false }]
  }

  // Ordena e mescla intervalos sobrepostos para evitar marks aninhados
  matchRanges.sort((rangeA, rangeB) => rangeA.start - rangeB.start)

  const mergedRanges: Array<{ start: number; end: number }> = []
  for (const range of matchRanges) {
    const lastMerged = mergedRanges[mergedRanges.length - 1]
    if (lastMerged && range.start <= lastMerged.end) {
      lastMerged.end = Math.max(lastMerged.end, range.end)
    } else {
      mergedRanges.push({ start: range.start, end: range.end })
    }
  }

  // Constrói os segmentos a partir dos intervalos mesclados
  const segments: TextSegment[] = []
  let cursor = 0

  for (const { start, end } of mergedRanges) {
    if (cursor < start) {
      segments.push({ text: text.slice(cursor, start), isMatch: false })
    }
    segments.push({ text: text.slice(start, end), isMatch: true })
    cursor = end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false })
  }

  return segments
}

/**
 * Componente puro que renderiza um texto com destaque dos trechos que
 * fazem match com a query de busca, respeitando acentos (accent-insensitive).
 */
export function HighlightText({ text, query }: HighlightTextProps) {
  const tokens = tokenizeQuery(query)
  const segments = buildSegments(text, tokens)

  return (
    <>
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark
            key={index}
            className="bg-primary/20 text-foreground rounded-sm px-0.5 not-italic"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}
