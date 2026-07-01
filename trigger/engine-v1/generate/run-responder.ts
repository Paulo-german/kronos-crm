import { generateText, type ModelMessage } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { RESPONDER_MAX_OUTPUT_TOKENS } from '../constants'
import type { LlmUsage } from '../types'
import { LLM_TEMPERATURE } from './constants'
import { stripLeakedToolCalls } from './strip-leaked-tool-calls'

interface RunResponderInput {
  modelId: string
  systemPrompt: string // COM persona (Call 2)
  messages: ModelMessage[]
  knowledgeBlock: string | null // prefetch de KB (load)
  groundingBlock: string | null // dados das buscas via tool (P7)
  handedOff: boolean // transfer → despedida
}

const HANDOFF_DIRECTIVE =
  'Você está transferindo este atendimento para um atendente humano. Despeça-se de forma breve e cordial, avisando que um atendente vai continuar a conversa. Não faça novas perguntas.'

// Call 2 do generate — o redator. generateText PURO (sem tools, sem Output.object):
// é o que evita os loops/travamentos. O system junta a persona + os fatos DESTE turno
// (KB pré-buscada, dados das buscas) + a instrução de despedida se transferiu. O texto
// é limpo de eventual JSON vazado antes de virar a resposta ao cliente.
export async function runResponder(
  input: RunResponderInput,
): Promise<{ text: string; usage: LlmUsage }> {
  const system = [
    input.systemPrompt,
    input.knowledgeBlock,
    input.groundingBlock,
    input.handedOff ? HANDOFF_DIRECTIVE : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n')

  const result = await generateText({
    model: getModel(input.modelId),
    system,
    messages: input.messages,
    temperature: LLM_TEMPERATURE,
    maxOutputTokens: RESPONDER_MAX_OUTPUT_TOKENS,
  })

  return {
    text: stripLeakedToolCalls(result.text ?? '').trim(),
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
    },
  }
}
