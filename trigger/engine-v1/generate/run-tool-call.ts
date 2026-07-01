import { generateText, stepCountIs, type ModelMessage, type ToolSet } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { TOOL_CALL_MAX_OUTPUT_TOKENS } from '../constants'
import type { LlmUsage } from '../types'
import {
  CALL1_DIRECTIVE,
  LLM_TEMPERATURE,
  TOOL_CALL_STEP_LIMIT,
} from './constants'

interface RunToolCallInput {
  modelId: string
  systemPromptForCall1: string
  messages: ModelMessage[]
  tools: ToolSet
}

export interface ExecutedTool {
  toolName: string
  output: unknown
}

export interface ToolCallResult {
  executedTools: ExecutedTool[]
  usage: LlmUsage
}

// Call 1 do generate — o "executor de busca". Roda o modelo com as ferramentas de
// LEITURA + handoff. O TEXTO É DESCARTADO (alguns modelos vazam "thinking" como
// texto); o que interessa é o que as ferramentas trouxeram. System SEM persona
// (aqui ela só vira ruído) + a diretiva de execução. Retorna só o que rodou — o
// redator (Call 2) fundamenta a resposta nisso e o handoff é detectado a partir daqui.
export async function runToolCall(
  input: RunToolCallInput,
): Promise<ToolCallResult> {
  const { tools } = input

  const result = await generateText({
    model: getModel(input.modelId),
    system: input.systemPromptForCall1 + CALL1_DIRECTIVE,
    messages: input.messages,
    tools,
    temperature: LLM_TEMPERATURE,
    stopWhen: stepCountIs(TOOL_CALL_STEP_LIMIT),
    maxOutputTokens: TOOL_CALL_MAX_OUTPUT_TOKENS,

    // Barreira anti-loop: após uma ferramenta rodar com sucesso, removê-la das
    // ativas. Todas as tools do engine são "uma vez por turno" (buscas + handoff),
    // então não precisa distinguir classes como o single.
    prepareStep: async ({ steps }) => {
      const executedOnce = new Set<string>()
      for (const step of steps) {
        for (const toolResult of step.toolResults ?? []) {
          if (didSucceed(toolResult.output))
            executedOnce.add(toolResult.toolName)
        }
      }
      if (executedOnce.size === 0) return {}
      const activeTools = Object.keys(tools).filter(
        (name) => !executedOnce.has(name),
      ) as Array<keyof typeof tools>
      return { activeTools }
    },
  })

  const executedTools: ExecutedTool[] = []
  for (const step of result.steps) {
    for (const toolResult of step.toolResults ?? []) {
      executedTools.push({
        toolName: toolResult.toolName,
        output: toolResult.output,
      })
    }
  }

  return {
    executedTools,
    usage: {
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
    },
  }
}

// Uma tool "teve sucesso" a menos que o output seja um objeto com success: false.
function didSucceed(output: unknown): boolean {
  return (
    typeof output !== 'object' ||
    output === null ||
    (output as Record<string, unknown>).success !== false
  )
}
