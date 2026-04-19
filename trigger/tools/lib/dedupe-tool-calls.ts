/**
 * @deprecated Substituído pelo callback `prepareStep` em
 * `trigger/agent/tool-agent.ts`, que remove dinamicamente as tools
 * idempotentes executadas com sucesso do toolSet do próximo step.
 * O wrapper runtime deste arquivo já não é mais importado por nenhum
 * código — mantido por uma release para rollback rápido.
 */

import type { Tool } from 'ai'
import { logger } from '@trigger.dev/sdk/v3'

// Tools que podem ser executadas múltiplas vezes por turno legitimamente
// (ex: criar 2 tarefas distintas, fazer 2 buscas com queries diferentes).
// Todas as demais tools são tratadas como idempotentes: uma execução bem-sucedida
// por turno é suficiente — tentativas extras são bloqueadas pelo dedup.
const MULTI_CALL_ALLOWED = new Set<string>([
  'create_task',
  'create_event',
  'search_knowledge',
  'search_products',
  'list_availability',
])

// Envolve cada tool com cache por `toolName`. Apenas execuções com sucesso
// entram no cache — se a tool falhou, o LLM pode (e deve) tentar de novo.
// O cache vive no escopo de uma invocação — chame DENTRO de run() do schemaTask,
// nunca em escopo de módulo. Retries do Trigger.dev criam novo run → novo Map.
export function wrapToolsWithDedup(
  tools: Record<string, Tool>,
  context: { conversationId: string; phaseTraceId: string },
): Record<string, Tool> {
  // Set de `toolName` — presença indica que já houve chamada bem-sucedida
  // para esta tool neste turno. Tools em MULTI_CALL_ALLOWED nunca entram aqui.
  const successCache = new Set<string>()

  const wrapped: Record<string, Tool> = {}
  for (const [toolName, originalTool] of Object.entries(tools)) {
    const originalExecute = originalTool.execute
    if (!originalExecute) {
      wrapped[toolName] = originalTool
      continue
    }

    wrapped[toolName] = {
      ...originalTool,
      execute: async (input, options) => {
        // Extrai callReason (presente em todas as mutation tools) para log estruturado.
        // Complementa o trace do Langfuse — o input completo já é capturado pelo
        // experimental_telemetry do AI SDK, mas este log dá visibilidade rápida
        // no Trigger.dev para diagnosticar loops/chamadas indevidas.
        const callReason =
          typeof input === 'object' && input !== null && 'callReason' in input
            ? String((input as Record<string, unknown>).callReason ?? '')
            : null
        if (callReason) {
          logger.info('Tool call reason', {
            toolName,
            callReason,
            conversationId: context.conversationId,
            phaseTraceId: context.phaseTraceId,
          })
        }

        const isMultiCallAllowed = MULTI_CALL_ALLOWED.has(toolName)

        if (!isMultiCallAllowed && successCache.has(toolName)) {
          logger.warn('Tool call deduped — already succeeded this turn', {
            toolName,
            conversationId: context.conversationId,
            phaseTraceId: context.phaseTraceId,
          })
          // Sem `success`/`previousResult` propositalmente — retornos desse tipo
          // sinalizam "tentou repetir" ao modelo sem dar pista de continuidade.
          return {
            alreadyExecutedThisTurn: true,
            message:
              'Esta ferramenta já foi executada com sucesso neste turno. Não chame novamente.',
          }
        }

        const result = await originalExecute(input, options)

        // Só cacheia se a execução foi bem-sucedida — falhas permitem retry.
        // Convenção do projeto: resultado é objeto com `success: boolean`.
        // Outras shapes (null/array/primitivos) são tratadas como sucesso por
        // falta de sinal explícito de erro.
        const didSucceed =
          !isMultiCallAllowed &&
          (typeof result !== 'object' ||
            result === null ||
            (result as Record<string, unknown>).success !== false)

        if (didSucceed) {
          successCache.add(toolName)
        }

        return result
      },
    } as Tool
  }

  return wrapped
}
