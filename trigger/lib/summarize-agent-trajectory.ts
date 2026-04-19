/**
 * @deprecated Substituído pela expansão de `metadata.agentTrajectory` em
 * múltiplas `ModelMessage` nativas do AI SDK v6 no orchestrator
 * (`trigger/process-agent-message.ts`). O sufixo textual gerado por este
 * helper destruía o sinal estrutural de tool-call/tool-result parts e
 * alimentava loops de re-execução entre turnos. Mantido para eventual
 * uso em logs/debug; não é mais importado pelo fluxo principal.
 *
 * Condensa a trajetória do tool-agent (result.response.messages do AI SDK v6)
 * em uma string curta no formato "[ações executadas: toolA (ok), toolB (erro)]".
 * Retorna null se não houver tool calls.
 */
export function summarizeTrajectory(trajectory: unknown): string | null {
  if (!Array.isArray(trajectory)) return null

  const toolCalls: Array<{ name: string; callId: string }> = []
  const toolResultsById = new Map<string, { success: boolean }>()

  for (const msg of trajectory) {
    if (typeof msg !== 'object' || msg === null) continue

    const role = (msg as { role?: string }).role
    const content = (msg as { content?: unknown }).content

    if (role === 'assistant' && Array.isArray(content)) {
      for (const part of content) {
        if (
          typeof part !== 'object' ||
          part === null ||
          (part as { type?: string }).type !== 'tool-call'
        ) {
          continue
        }

        toolCalls.push({
          name: String((part as { toolName: string }).toolName),
          callId: String((part as { toolCallId: string }).toolCallId),
        })
      }
    }

    if (role === 'tool' && Array.isArray(content)) {
      for (const part of content) {
        if (
          typeof part !== 'object' ||
          part === null ||
          (part as { type?: string }).type !== 'tool-result'
        ) {
          continue
        }

        const callId = String((part as { toolCallId: string }).toolCallId)

        // AI SDK v6: erro expresso via output.type === 'error-text' | 'error-json'.
        // Não existe campo `isError` top-level no ToolResultPart.
        const output = (part as { output?: { type?: string } }).output
        const isError =
          typeof output?.type === 'string' && output.type.startsWith('error')

        toolResultsById.set(callId, { success: !isError })
      }
    }
  }

  if (toolCalls.length === 0) return null

  const parts = toolCalls.map((call) => {
    const resultEntry = toolResultsById.get(call.callId)
    const status = resultEntry
      ? resultEntry.success
        ? 'ok'
        : 'erro'
      : 'sem_retorno'
    return `${call.name} (${status})`
  })

  return `[ações executadas: ${parts.join(', ')}]`
}
