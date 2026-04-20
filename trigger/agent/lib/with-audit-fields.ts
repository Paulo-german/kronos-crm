/**
 * Decorator para injetar o campo `callReason` nas tools apenas no pipeline v3 (tool-agent).
 * Mantém as tools base puras (port de domínio), sem dependência do concern de auditoria do agente.
 *
 * Por que decorator e não campo no schema base: v1/v2 não instruem o LLM a preencher
 * callReason — se o campo fosse obrigatório no schema, a omissão geraria validation error
 * e dispararia retry loop. O v3 recebe o campo via `.extend()` antes de passar ao generateText.
 */
import type { Tool } from 'ai'
import { z } from 'zod'

const callReasonField = z
  .string()
  .min(10)
  .describe(
    'Motivo curto (1 frase) do porquê esta ferramenta está sendo chamada agora, referenciando o gatilho do Processo de Atendimento que justifica a ação. Obrigatório para auditoria.',
  )

export function withCallReason<T extends Tool>(tool: T): T {
  // inputSchema é ZodObject — .extend() adiciona callReason sem alterar os campos originais.
  // Cast necessário porque o SDK não expõe o genérico do input de forma que TypeScript
  // consiga inferir o tipo resultante do .extend() sem perder a identidade de T.
  const extendedSchema = (tool.inputSchema as z.ZodObject<z.ZodRawShape>).extend({
    callReason: callReasonField,
  })

  return {
    ...tool,
    inputSchema: extendedSchema,
  } as T
}

// Helper para aplicar o decorator em um toolSet inteiro de uma só vez.
export function withCallReasonAll<T extends Record<string, Tool>>(tools: T): T {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [name, withCallReason(tool)]),
  ) as T
}
