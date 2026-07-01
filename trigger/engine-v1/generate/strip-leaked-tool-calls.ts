// Remove JSON de tool call que alguns modelos vazam como TEXTO (em vez de emitir uma
// tool call de verdade). Reescrito enxuto pro engine — mira nos padrões estruturais
// com um nome de ferramenta conhecido, pra não apagar JSON legítimo do cliente.
const ENGINE_TOOL_NAMES = new Set([
  'search_knowledge',
  'search_products',
  'hand_off_to_human',
])

export function stripLeakedToolCalls(text: string): string {
  let cleaned = text

  // {"tool":"search_products", …} / {"function":"…"} / {"action":"…"}
  cleaned = cleaned.replace(
    /\{[^{}]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^{}]*\}/g,
    (match, name: string) => (ENGINE_TOOL_NAMES.has(name) ? '' : match),
  )

  // Bloco ```json { …tool… } ```
  cleaned = cleaned.replace(
    /```(?:json)?\s*\n?\{[^`]*"(?:tool|function|action)"\s*:\s*"([a-z_]+)"[^`]*\}[\s\n]*```/g,
    (match, name: string) => (ENGINE_TOOL_NAMES.has(name) ? '' : match),
  )

  // Formato Meta: {"recipientname":"functions.handofftohuman","parameters":{…}}
  cleaned = cleaned.replace(
    /\{[^{}]*"recipientname"\s*:\s*"functions\.[^"]*"[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g,
    '',
  )

  return cleaned.trim()
}
