export type WhatsappTextToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'mono'; value: string }

// Lookarounds evitam que `* 3 *` (matemática) vire bold: o conteúdo não pode
// começar nem terminar com whitespace, precisa ter ao menos 1 char, e nunca
// atravessa newline. Sem aninhamento — o primeiro marcador que casar vence.
const MARKER_REGEX =
  /(\*(?!\s)[^*\n]+?(?<!\s)\*|_(?!\s)[^_\n]+?(?<!\s)_|~(?!\s)[^~\n]+?(?<!\s)~|`(?!\s)[^`\n]+?(?<!\s)`)/g

export function tokenizeWhatsappText(content: string): WhatsappTextToken[] {
  if (!content) return []

  const parts = content.split(MARKER_REGEX)
  const tokens: WhatsappTextToken[] = []

  for (const part of parts) {
    if (!part) continue

    const first = part[0]
    const last = part[part.length - 1]

    if (part.length >= 3 && first === last) {
      const inner = part.slice(1, -1)
      if (first === '*') {
        tokens.push({ type: 'bold', value: inner })
        continue
      }
      if (first === '_') {
        tokens.push({ type: 'italic', value: inner })
        continue
      }
      if (first === '~') {
        tokens.push({ type: 'strike', value: inner })
        continue
      }
      if (first === '`') {
        tokens.push({ type: 'mono', value: inner })
        continue
      }
    }

    const previous = tokens[tokens.length - 1]
    if (previous?.type === 'text') {
      previous.value += part
    } else {
      tokens.push({ type: 'text', value: part })
    }
  }

  return tokens
}
