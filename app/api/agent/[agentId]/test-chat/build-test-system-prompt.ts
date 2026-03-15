import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import { stepActionSchema, type StepAction } from '@/_actions/agent/shared/step-action-schema'
import { searchKnowledge } from '@/../trigger/utils/search-knowledge'
import {
  compilePromptConfig,
  compileStepActions,
  compileToolsSection,
} from '@/../trigger/build-system-prompt'

export interface BuildTestSystemPromptResult {
  systemPrompt: string
  modelId: string
  agentName: string
  estimatedTokens: number
  toolsEnabled: string[]
  allStepActions: StepAction[]
}

/**
 * Constrói o system prompt para o modo de teste do agente.
 *
 * Diferenças em relação ao buildSystemPrompt de produção:
 * - Omite seções de contato e deal (não existem em ambiente de teste)
 * - Adiciona bloco [Modo de Teste] instruindo o LLM a usar tools normalmente
 *   (os tools de CRM são registrados com execute mockado — zero side-effects)
 */
export async function buildTestSystemPrompt(
  agentId: string,
  organizationId: string,
  latestUserMessage?: string,
): Promise<BuildTestSystemPromptResult> {
  const now = new Date()

  const [agent, completedFileCount] = await Promise.all([
    db.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        name: true,
        systemPrompt: true,
        promptConfig: true,
        modelId: true,
        pipelineIds: true,
        steps: {
          orderBy: { order: 'asc' },
          select: {
            name: true,
            objective: true,
            order: true,
            actions: true,
            keyQuestion: true,
            messageTemplate: true,
          },
        },
      },
    }),
    db.agentKnowledgeFile.count({
      where: { agentId, status: 'COMPLETED' },
    }),
  ])

  // Coletar flat array de todas as actions parseadas dos steps
  const allStepActions: StepAction[] = agent.steps.flatMap((step) => {
    const parsed = z.array(stepActionSchema).safeParse(step.actions)
    return parsed.success ? parsed.data : []
  })

  // Derivar conjunto de tools das actions (mesmo cálculo do buildSystemPrompt de produção)
  const baseEffectiveTools = [...new Set(allStepActions.map((action) => action.type))]
  const hasReschedulableEvent = allStepActions.some(
    (action) => action.type === 'create_event' && action.allowReschedule,
  )
  const effectiveTools = hasReschedulableEvent
    ? [...baseEffectiveTools, 'update_event']
    : baseEffectiveTools

  const parts: string[] = []

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  // 1. Persona base (structured ou fallback legado)
  const parsedConfig = promptConfigSchema.safeParse(agent.promptConfig)
  const promptConfig = parsedConfig.success ? parsedConfig.data : null

  if (promptConfig) {
    parts.push(compilePromptConfig(promptConfig, agent.name))
    if (agent.systemPrompt.trim()) {
      parts.push(`\n[Instruções adicionais]\n${agent.systemPrompt}`)
    }
  } else {
    parts.push(`Seu nome é ${agent.name}.\n\n${agent.systemPrompt}`)
  }

  // 2. Ferramentas disponíveis (descrição de todas, mesmo que não sejam tools reais no teste)
  const toolsSection = compileToolsSection(effectiveTools)
  if (toolsSection) {
    parts.push(`\n${toolsSection}`)
  }

  // 3. Processo de atendimento (etapas com ações imperativas)
  if (agent.steps.length > 0) {
    const lines: string[] = []
    lines.push('## Processo de Atendimento')
    lines.push('')
    lines.push(
      'Siga as etapas abaixo na ordem. Identifique em que ponto da conversa ' +
        'você está pelo contexto do histórico e conduza o lead para a próxima etapa naturalmente.',
    )

    for (const step of agent.steps) {
      lines.push('')
      lines.push(`**${step.order + 1}. ${step.name}**`)
      lines.push(step.objective)

      if (step.keyQuestion) {
        lines.push(`* Pergunta-chave: "${step.keyQuestion}"`)
      }

      const parsed = z.array(stepActionSchema).safeParse(step.actions)
      if (parsed.success && parsed.data.length > 0) {
        lines.push(...compileStepActions(parsed.data))
      }

      if (step.messageTemplate) {
        lines.push('')
        lines.push('**Exemplo de fechamento:**')
        lines.push(`"${step.messageTemplate}"`)
      }
    }

    parts.push(`\n${lines.join('\n')}`)
  }

  // 4. Contexto temporal
  parts.push(
    `\n[Contexto temporal]\nAgora: ${dateFormatter.format(now)} (UTC-3, horário de Brasília)\nAo gerar datas para ferramentas, use sempre ISO 8601 com offset: 2026-03-10T14:00:00-03:00`,
  )

  // 5. Bloco de Modo de Teste — instrui o LLM a usar tools normalmente (execute mockado no backend)
  const testModeLines: string[] = [
    '[Modo de Teste]',
    'Você está em um ambiente de TESTE.',
    '- NÃO há dados de contato ou negócio vinculados (use exemplos fictícios quando necessário).',
    '- As ferramentas de CRM estão registradas e você DEVE chamá-las normalmente',
    '  (os resultados serão simulados no backend — o usuário verá as ações como cards visuais).',
    '- NÃO descreva o que faria em texto — EXECUTE a ferramenta diretamente.',
  ]

  if (completedFileCount > 0) {
    testModeLines.push(
      `- search_knowledge funciona normalmente com a base real de conhecimento (${completedFileCount} arquivo${completedFileCount > 1 ? 's' : ''} indexado${completedFileCount > 1 ? 's' : ''}).`,
    )
  }

  parts.push(`\n${testModeLines.join('\n')}`)

  // 6. Busca RAG na base de conhecimento (se houver arquivos e mensagem do usuário)
  if (latestUserMessage && completedFileCount > 0) {
    try {
      const results = await searchKnowledge(agentId, latestUserMessage, 3, 0.72)

      if (results.length > 0) {
        const contextLines = results.map(
          (result) =>
            `[${result.fileName}] (similaridade: ${result.similarity.toFixed(2)})\n${result.content}`,
        )
        const knowledgeContext = contextLines.join('\n\n---\n\n')

        parts.push(
          `\n[Base de conhecimento]\nOs trechos abaixo foram recuperados da sua base de conhecimento e são relevantes para a mensagem do usuário. Use essas informações para fundamentar sua resposta:\n\n${knowledgeContext}`,
        )
      }
    } catch (error) {
      console.warn('[buildTestSystemPrompt] Knowledge search failed, continuing without RAG', {
        agentId,
        error,
      })
    }
  }

  const systemPrompt = parts.join('\n')

  // Estimativa aproximada: ~4 caracteres por token
  const estimatedTokens = Math.ceil(systemPrompt.length / 4)

  return {
    systemPrompt,
    modelId: agent.modelId,
    agentName: agent.name,
    estimatedTokens,
    toolsEnabled: effectiveTools,
    allStepActions,
  }
}
