import { generateText } from 'ai'
import { logger } from '@trigger.dev/sdk/v3'
import { getModel } from '@/_lib/ai/provider'
import type { ModelMessage } from '../lib/two-phase-types'
import type { SingleGuardCorrectedContext } from './single-guard'

// Re-exporta para que importadores externos não precisem depender de single-guard diretamente
export type { SingleGuardCorrectedContext }

// Limite de attempts para o fallback — 2 é suficiente para reescritas determinísticas
const FALLBACK_MAX_ATTEMPTS = 2

// Temperatura baixa: o fallback deve ser determinístico e fiel à correção recebida
const FALLBACK_TEMPERATURE = 0.3

export interface SingleFallbackInput {
  modelId: string
  rejectedMessage: string
  guardViolations: Array<{ type: string; details: string }>
  correctedContext: SingleGuardCorrectedContext | undefined
  llmMessages: ModelMessage[]
  toolResults: unknown
  agentPersona: {
    name: string
    voice: string
  }
  conversationId: string
  organizationId: string
}

export interface SingleFallbackResult {
  text: string
  usage: { inputTokens: number; outputTokens: number }
}

/**
 * Gera nova resposta textual pura quando o single-guard rejeita a mensagem principal.
 *
 * Não acessa tools deliberadamente: o guard já carregou o contexto factual correto
 * (preços autorizados, instruções de reescrita) via correctedContext, tornando
 * retooling desnecessário e evitando execução duplicada de side-effects.
 */
export async function runSingleFallback(
  input: SingleFallbackInput,
): Promise<SingleFallbackResult> {
  const {
    modelId,
    rejectedMessage,
    guardViolations,
    correctedContext,
    llmMessages,
    toolResults,
    agentPersona,
    conversationId,
    organizationId,
  } = input

  // Montar lista legível de violações para o system prompt
  const violationsList = guardViolations
    .map((v) => `- [${v.type}]: ${v.details}`)
    .join('\n')

  // Seção de tabela de preços autorizados — só incluída quando o guard passou esta informação
  const authorizedPricesSection =
    correctedContext?.authorizedPrices && correctedContext.authorizedPrices.length > 0
      ? [
          '\n## PREÇOS AUTORIZADOS',
          'Use EXCLUSIVAMENTE os preços abaixo. Qualquer outro valor é incorreto.',
          '',
          ...correctedContext.authorizedPrices.map(
            (p) => `- ${p.productName}: ${p.price} ${p.currency}`,
          ),
        ].join('\n')
      : ''

  // Instruções específicas do guard para esta reescrita
  const guardInstructions = correctedContext?.instructionsToFallback
    ? `\n## INSTRUÇÕES DE CORREÇÃO\n${correctedContext.instructionsToFallback}`
    : ''

  const systemPrompt = [
    `Você é ${agentPersona.name}.`,
    `Tom de voz: ${agentPersona.voice}`,
    '',
    '## TAREFA',
    'A mensagem abaixo foi REJEITADA pelo sistema de qualidade por violar as regras de comunicação.',
    'Reescreva-a de forma que atenda às regras. Use as informações do histórico e das ações já executadas.',
    '',
    '## VIOLAÇÕES IDENTIFICADAS',
    violationsList,
    guardInstructions,
    authorizedPricesSection,
    '',
    '## REGRAS INVIOLÁVEIS',
    '- NÃO mencione IDs internos, nomes de ferramentas ou raciocínio interno.',
    '- NÃO use chamadas de ferramentas. Apenas texto natural.',
    '- NÃO repita os erros listados acima.',
    '- Mantenha o tom e persona definidos.',
    '',
    '## MENSAGEM REJEITADA (para referência)',
    rejectedMessage,
  ]
    .filter((line) => line !== null)
    .join('\n')

  // Montar array de mensagens: system prompt reduzido + histórico original (sem system prompt original)
  // Filtramos o primeiro system message do histórico para evitar instruções conflitantes
  const historyWithoutSystem = llmMessages.filter((msg) => msg.role !== 'system')

  const fallbackMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Incluir histórico de mensagens como contexto (apenas user/assistant)
  for (const msg of historyWithoutSystem) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      fallbackMessages.push({ role: msg.role, content })
    }
  }

  // Resumo em prosa das ações já executadas no backend para evitar repetição de side-effects
  if (toolResults !== null && toolResults !== undefined) {
    const toolSummary = buildToolResultsSummary(toolResults)
    if (toolSummary) {
      fallbackMessages.push({
        role: 'system',
        content: `Ações já executadas no backend (NÃO repita): ${toolSummary}`,
      })
    }
  }

  const startedAt = Date.now()

  const fallbackResult = await generateText({
    model: getModel(modelId),
    messages: fallbackMessages,
    temperature: FALLBACK_TEMPERATURE,
    maxRetries: FALLBACK_MAX_ATTEMPTS,
    // Sem tools: fallback é puramente textual — retooling repetiria side-effects
    // e tenderia a convergir no mesmo erro que o agente principal cometeu
  })

  const durationMs = Date.now() - startedAt

  logger.info('single-fallback completed', {
    conversationId,
    organizationId,
    modelId,
    durationMs,
    violationCount: guardViolations.length,
    inputTokens: fallbackResult.usage?.inputTokens ?? 0,
    outputTokens: fallbackResult.usage?.outputTokens ?? 0,
    responseLength: fallbackResult.text.length,
  })

  return {
    text: fallbackResult.text,
    usage: {
      inputTokens: fallbackResult.usage?.inputTokens ?? 0,
      outputTokens: fallbackResult.usage?.outputTokens ?? 0,
    },
  }
}

/**
 * Converte o resultado bruto dos steps do main agent em prosa legível.
 * Extrai apenas os tool calls e seus resultados — não expõe IDs internos ao LLM.
 */
function buildToolResultsSummary(toolResults: unknown): string {
  if (!Array.isArray(toolResults)) return ''

  const summaryParts: string[] = []

  for (const step of toolResults) {
    if (typeof step !== 'object' || step === null) continue

    const stepRecord = step as Record<string, unknown>
    const toolCalls = stepRecord.toolCalls

    if (!Array.isArray(toolCalls)) continue

    for (const toolCall of toolCalls) {
      if (typeof toolCall !== 'object' || toolCall === null) continue

      const call = toolCall as Record<string, unknown>
      const toolName = typeof call.toolName === 'string' ? call.toolName : null

      if (!toolName) continue

      // Mapear nomes internos de tools para prosa amigável
      const toolDescription = TOOL_PROSE_MAP[toolName] ?? `ação "${toolName}"`
      summaryParts.push(toolDescription)
    }
  }

  if (summaryParts.length === 0) return ''

  return summaryParts.join(', ') + '.'
}

// Mapa de tool names internos → descrição em prosa para o fallback
// Evita que o fallback mencione nomes de tools ao cliente
const TOOL_PROSE_MAP: Record<string, string> = {
  move_deal: 'negócio movido no CRM',
  update_contact: 'dados do contato atualizados',
  update_deal: 'negócio atualizado no CRM',
  create_task: 'tarefa criada',
  create_event: 'agendamento criado',
  update_event: 'agendamento atualizado',
  hand_off_to_human: 'transferência para atendente solicitada',
  search_products: 'produtos consultados',
  search_knowledge: 'base de conhecimento consultada',
  list_availability: 'disponibilidade verificada',
  send_product_media: 'mídia de produto enviada',
  send_media: 'mídia enviada',
  transfer_to_agent: 'conversa transferida para outro agente',
}
