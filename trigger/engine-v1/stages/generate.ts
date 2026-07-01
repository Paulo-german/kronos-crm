import { prepareToolData } from '../generate/prepare-tool-data'
import { runResponder } from '../generate/run-responder'
import { runToolCall } from '../generate/run-tool-call'
import type { LlmUsage, Stage } from '../types'

// Gera a resposta do agente em 2 chamadas: Call 1 (buscar — executa ferramentas de
// leitura/handoff, texto descartado) e Call 2 (escrever — texto puro).
export const generate: Stage = async (state) => {
  const {
    modelId,
    prompt,
    messages,
    tools,
    knowledgeBlock,
    qualificationBlock,
  } = state
  if (!modelId || !prompt || !messages || !tools) {
    // O load garante estes campos; se chegou aqui sem eles, é bug de pipeline.
    throw new Error('generate: estado incompleto — load precisa rodar antes.')
  }

  const startedAt = Date.now()

  // Call 1 — buscar. Devolve o que as ferramentas trouxeram + os tokens.
  const { executedTools, usage: toolUsage } = await runToolCall({
    modelId,
    systemPromptForCall1: prompt.systemPromptForCall1,
    messages,
    tools,
  })

  // Digere: bloco de fatos (grounding) pro redator + se o agente transferiu (transfer).
  const { groundingBlock, handedOff } = prepareToolData(executedTools)

  // Call 2 — escrever. Persona + KB pré-buscada + dados das buscas + despedida (se
  // transferiu) → texto final limpo.
  const { text, usage: responderUsage } = await runResponder({
    modelId,
    systemPrompt: prompt.systemPrompt,
    messages,
    // Se transferiu, a despedida manda — não cobra o pendente neste turno.
    qualificationBlock: handedOff ? null : (qualificationBlock ?? null),
    knowledgeBlock: knowledgeBlock ?? null,
    groundingBlock,
    handedOff,
  })

  return {
    responseText: text,
    usage: sumUsage(toolUsage, responderUsage),
    handedOff,
    llmDurationMs: Date.now() - startedAt,
  }
}

// Soma os tokens das 2 chamadas (Call 1 + Call 2) pro settleCredits/metadata.
function sumUsage(first: LlmUsage, second: LlmUsage): LlmUsage {
  return {
    inputTokens: (first.inputTokens ?? 0) + (second.inputTokens ?? 0),
    outputTokens: (first.outputTokens ?? 0) + (second.outputTokens ?? 0),
  }
}
