import { z } from 'zod'

export const ROUTER_MAX_OUTPUT_TOKENS = 1024

export const routerResponseSchema = z.object({
  targetAgentId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
})

interface RouterRule {
  agentId: string
  keywords?: string[]
  description?: string
}

export interface RouterConfig {
  fallbackAgentId: string | null
  rules?: RouterRule[]
}

export interface RouterActiveWorker {
  agentId: string
  agent: { name: string }
  scopeLabel: string
}

interface BuildRouterSystemPromptInput {
  activeWorkers: RouterActiveWorker[]
  routerConfig: RouterConfig | null
  routerPrompt: string | null
}

export function buildRouterSystemPrompt({
  activeWorkers,
  routerConfig,
  routerPrompt,
}: BuildRouterSystemPromptInput): string {
  const workerDescriptions = activeWorkers
    .map(
      (worker) =>
        `- Agent ID: "${worker.agentId}" | Nome: "${worker.agent.name}" | Escopo: "${worker.scopeLabel}"`,
    )
    .join('\n')

  const customRules = routerConfig?.rules
    ?.map((rule) => {
      const worker = activeWorkers.find((activeWorker) => activeWorker.agentId === rule.agentId)
      if (!worker) return null
      const parts = [`- Para "${worker.agent.name}"`]
      if (rule.keywords?.length) parts.push(`quando mencionado: ${rule.keywords.join(', ')}`)
      if (rule.description) parts.push(`regra: ${rule.description}`)
      return parts.join(' ')
    })
    .filter(Boolean)
    .join('\n')

  const fallbackInstruction = routerConfig?.fallbackAgentId
    ? `- Se nenhum worker for claramente adequado, direcione para o agente com ID "${routerConfig.fallbackAgentId}".`
    : '- Se nenhum worker for claramente adequado, escolha o mais generico.'

  const basePromptParts = [
    'Voce e um classificador de conversas. Sua funcao e analisar a mensagem do cliente e decidir qual agente especializado deve atende-lo.',
    '',
    '## Agentes Disponiveis',
    workerDescriptions,
    '',
    '## Regras',
    '- Analise a mensagem e o contexto para determinar a intencao do cliente.',
    '- Retorne o agentId do worker mais adequado.',
    fallbackInstruction,
    '- Responda APENAS no formato JSON solicitado.',
  ]

  if (customRules) {
    basePromptParts.push('', '## Regras Customizadas', customRules)
  }

  if (routerPrompt) {
    basePromptParts.push('', '## Instrucoes Adicionais', routerPrompt)
  }

  return basePromptParts.join('\n')
}

export function buildRouterUserContent(
  messageHistory: Array<{ role: string; content: string }>,
): string {
  return messageHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')
}
