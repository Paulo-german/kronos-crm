import { db } from '@/_lib/prisma'
import { searchKnowledge } from './utils/search-knowledge'
import { logger } from '@trigger.dev/sdk/v3'

interface BuildSystemPromptResult {
  systemPrompt: string
  modelId: string
  summary: string | null
  contactName: string
  currentStepOrder: number
  estimatedTokens: number
  toolsEnabled: string[]
  pipelineIds: string[]
  knowledgeContext: string | null
}

/**
 * Constrói o system prompt dinâmico concatenando:
 * 1. Persona base (agent.systemPrompt)
 * 2. Contexto temporal (data/hora atual em SP)
 * 3. Dados do contato (nome, telefone, email, cargo)
 * 4. Mapa de steps (marcando etapa atual)
 */
export async function buildSystemPrompt(
  agentId: string,
  conversationId: string,
  latestUserMessage?: string,
): Promise<BuildSystemPromptResult> {
  const [agent, conversation, completedFileCount] = await Promise.all([
    db.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        systemPrompt: true,
        modelId: true,
        toolsEnabled: true,
        pipelineIds: true,
        steps: {
          orderBy: { order: 'asc' },
          select: {
            name: true,
            objective: true,
            order: true,
          },
        },
      },
    }),
    db.agentConversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: {
        summary: true,
        currentStepOrder: true,
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    db.agentKnowledgeFile.count({
      where: { agentId, status: 'COMPLETED' },
    }),
  ])

  const parts: string[] = []

  // 1. Persona base
  parts.push(agent.systemPrompt)

  // 2. Contexto temporal
  const now = new Date()
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  })
  parts.push(`\n[Contexto temporal]\nAgora: ${dateFormatter.format(now)}`)

  // 3. Dados do contato
  const contact = conversation.contact
  const contactFields = [
    `Nome: ${contact.name}`,
    contact.phone ? `Telefone: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.role ? `Cargo: ${contact.role}` : null,
  ].filter(Boolean)

  parts.push(`\n[Dados do contato]\n${contactFields.join('\n')}`)

  // 4. Mapa de steps (se houver)
  if (agent.steps.length > 0) {
    const stepLines = agent.steps.map((step) => {
      const isCurrent = step.order === conversation.currentStepOrder
      const marker = isCurrent ? '→' : ' '
      return `${marker} Etapa ${step.order}: ${step.name} — ${step.objective}`
    })

    parts.push(
      `\n[Etapas do atendimento]\n${stepLines.join('\n')}\nEtapa atual: ${conversation.currentStepOrder}`,
    )
  }

  // 5. Busca RAG na base de conhecimento (se houver arquivos e mensagem do usuário)
  let knowledgeContext: string | null = null

  if (latestUserMessage && completedFileCount > 0) {
    try {
      const results = await searchKnowledge(agentId, latestUserMessage, 3, 0.72)

      if (results.length > 0) {
        const contextLines = results.map(
          (result) => `[${result.fileName}] (similaridade: ${result.similarity.toFixed(2)})\n${result.content}`,
        )
        knowledgeContext = contextLines.join('\n\n---\n\n')

        parts.push(
          `\n[Base de conhecimento]\nOs trechos abaixo foram recuperados da sua base de conhecimento e são relevantes para a mensagem do cliente. Use essas informações para fundamentar sua resposta:\n\n${knowledgeContext}`,
        )
      }
    } catch (error) {
      logger.warn('Knowledge search failed, continuing without RAG', { agentId, error })
    }
  }

  const systemPrompt = parts.join('\n')

  // Estimativa aproximada: ~4 caracteres por token
  const estimatedTokens = Math.ceil(systemPrompt.length / 4)

  return {
    systemPrompt,
    modelId: agent.modelId,
    summary: conversation.summary,
    contactName: contact.name,
    currentStepOrder: conversation.currentStepOrder,
    estimatedTokens,
    toolsEnabled: agent.toolsEnabled,
    pipelineIds: agent.pipelineIds,
    knowledgeContext,
  }
}
