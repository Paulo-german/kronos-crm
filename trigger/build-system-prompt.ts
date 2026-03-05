import { db } from '@/_lib/prisma'
import { searchKnowledge } from './utils/search-knowledge'
import { logger } from '@trigger.dev/sdk/v3'

interface BuildSystemPromptResult {
  systemPrompt: string
  modelId: string
  agentName: string
  summary: string | null
  contactName: string
  currentStepOrder: number
  estimatedTokens: number
  toolsEnabled: string[]
  pipelineIds: string[]
  knowledgeContext: string | null
  currentStepAllowedActions: string[] | null
}

/**
 * Constrói o system prompt dinâmico concatenando:
 * 1. Persona base (agent.systemPrompt)
 * 2. Contexto temporal (data/hora atual em SP)
 * 3. Dados do contato (nome, telefone, email, cargo)
 * 4. Dados do negócio (deal vinculado, se houver)
 * 5. Etapas do pipeline (se move_deal habilitado e deal vinculado)
 * 6. Motivos de perda disponíveis (se update_deal habilitado)
 * 7. Mapa de steps (marcando etapa atual)
 * 8. Busca RAG na base de conhecimento
 */
export async function buildSystemPrompt(
  agentId: string,
  conversationId: string,
  organizationId: string,
  latestUserMessage?: string,
): Promise<BuildSystemPromptResult> {
  const now = new Date()

  const [agent, conversation, completedFileCount, lossReasons] = await Promise.all([
    db.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        name: true,
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
            allowedActions: true,
          },
        },
      },
    }),
    db.conversation.findUniqueOrThrow({
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
        deal: {
          select: {
            title: true,
            status: true,
            priority: true,
            value: true,
            notes: true,
            expectedCloseDate: true,
            stage: {
              select: {
                name: true,
                pipeline: {
                  select: {
                    stages: {
                      orderBy: { position: 'asc' },
                      select: { name: true, position: true },
                    },
                  },
                },
              },
            },
            company: { select: { name: true } },
            contacts: {
              select: {
                contact: {
                  select: { name: true, email: true, phone: true, role: true },
                },
              },
            },
            dealProducts: {
              select: {
                quantity: true,
                unitPrice: true,
                discountType: true,
                discountValue: true,
                product: { select: { name: true } },
              },
            },
            tasks: {
              where: { isCompleted: false },
              orderBy: { dueDate: 'asc' },
              take: 5,
              select: { title: true, dueDate: true, type: true },
            },
            appointments: {
              where: { status: 'SCHEDULED', startDate: { gte: now } },
              orderBy: { startDate: 'asc' },
              take: 3,
              select: { title: true, startDate: true, endDate: true },
            },
          },
        },
      },
    }),
    db.agentKnowledgeFile.count({
      where: { agentId, status: 'COMPLETED' },
    }),
    db.dealLostReason.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const parts: string[] = []

  // 1. Persona base
  parts.push(agent.systemPrompt)

  // 2. Contexto temporal
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

  // 4. Dados do negócio (se houver deal vinculado)
  if (conversation.deal) {
    const deal = conversation.deal
    const dealFields: string[] = []

    dealFields.push(`Título: ${deal.title}`)
    dealFields.push(`Status: ${deal.status}`)
    dealFields.push(`Prioridade: ${deal.priority}`)
    dealFields.push(`Etapa: ${deal.stage.name}`)

    if (Number(deal.value) > 0) {
      dealFields.push(
        `Valor: R$ ${Number(deal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      )
    }

    if (deal.company) {
      dealFields.push(`Empresa: ${deal.company.name}`)
    }

    if (deal.expectedCloseDate) {
      dealFields.push(
        `Previsão de fechamento: ${dateFormatter.format(deal.expectedCloseDate)}`,
      )
    }

    if (deal.notes) {
      dealFields.push(`Notas: ${deal.notes}`)
    }

    // Contatos vinculados ao deal
    if (deal.contacts.length > 0) {
      const contactLines = deal.contacts.map((dealContact) => {
        const infoParts = [dealContact.contact.name]
        if (dealContact.contact.role)
          infoParts.push(`(${dealContact.contact.role})`)
        if (dealContact.contact.email)
          infoParts.push(`— ${dealContact.contact.email}`)
        if (dealContact.contact.phone)
          infoParts.push(`— ${dealContact.contact.phone}`)
        return `  • ${infoParts.join(' ')}`
      })
      dealFields.push(`Contatos:\n${contactLines.join('\n')}`)
    }

    // Produtos
    if (deal.dealProducts.length > 0) {
      const productLines = deal.dealProducts.map((dealProduct) => {
        const subtotal = Number(dealProduct.unitPrice) * dealProduct.quantity
        const discount =
          dealProduct.discountType === 'percentage'
            ? subtotal * (Number(dealProduct.discountValue) / 100)
            : Number(dealProduct.discountValue)
        const finalPrice = subtotal - discount
        return `  • ${dealProduct.product.name} — ${dealProduct.quantity}x R$ ${Number(dealProduct.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      })
      const totalProducts = deal.dealProducts.reduce((sum, dealProduct) => {
        const subtotal = Number(dealProduct.unitPrice) * dealProduct.quantity
        const discount =
          dealProduct.discountType === 'percentage'
            ? subtotal * (Number(dealProduct.discountValue) / 100)
            : Number(dealProduct.discountValue)
        return sum + subtotal - discount
      }, 0)
      dealFields.push(
        `Produtos:\n${productLines.join('\n')}\n  Total: R$ ${totalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      )
    }

    // Tarefas pendentes
    if (deal.tasks.length > 0) {
      const taskLines = deal.tasks.map((task) => {
        const dueFormatted = dateFormatter.format(task.dueDate)
        return `  • ${task.title} (${task.type}) — vence ${dueFormatted}`
      })
      dealFields.push(`Tarefas pendentes:\n${taskLines.join('\n')}`)
    }

    // Próximos compromissos
    if (deal.appointments.length > 0) {
      const apptLines = deal.appointments.map((appt) => {
        const startFormatted = dateFormatter.format(appt.startDate)
        return `  • ${appt.title} — ${startFormatted}`
      })
      dealFields.push(`Próximos compromissos:\n${apptLines.join('\n')}`)
    }

    parts.push(`\n[Dados do negócio]\n${dealFields.join('\n')}`)

    // 5. Etapas do pipeline (só se a tool move_deal está habilitada)
    if (agent.toolsEnabled.includes('move_deal')) {
      const pipelineStages = deal.stage.pipeline.stages
      const stageLines = pipelineStages.map(
        (stage) => `  ${stage.position}. ${stage.name}`,
      )
      parts.push(
        `\n[Etapas do pipeline]\nAo mover um negócio, use o campo "stageName" com uma das etapas abaixo:\n${stageLines.join('\n')}\nEtapa atual: ${deal.stage.name}`,
      )
    }
  }

  // 6. Motivos de perda disponíveis (só se a tool update_deal está habilitada)
  if (lossReasons.length > 0 && agent.toolsEnabled.includes('update_deal')) {
    const reasonNames = lossReasons.map((r) => r.name)
    parts.push(
      `\n[Motivos de perda disponíveis]\nAo marcar um negócio como LOST, use o campo "reason" com um dos motivos abaixo (exatamente como escrito):\n${reasonNames.map((name) => `  • ${name}`).join('\n')}`,
    )
  }

  // 7. Mapa de steps (se houver)
  // Encontrar o step atual e extrair allowedActions
  const currentStep = agent.steps.find(
    (step) => step.order === conversation.currentStepOrder,
  )
  const currentStepAllowedActions =
    currentStep && currentStep.allowedActions.length > 0
      ? currentStep.allowedActions
      : null

  if (agent.steps.length > 0) {
    const stepLines = agent.steps.map((step) => {
      const isCurrent = step.order === conversation.currentStepOrder
      const marker = isCurrent ? '→' : ' '
      const actionsInfo =
        step.allowedActions.length > 0
          ? ` [Ações: ${step.allowedActions.join(', ')}]`
          : ''
      return `${marker} Etapa ${step.order}: ${step.name} — ${step.objective}${actionsInfo}`
    })

    parts.push(
      `\n[Etapas do atendimento]\n${stepLines.join('\n')}\nEtapa atual: ${conversation.currentStepOrder}`,
    )
  }

  // 8. Busca RAG na base de conhecimento (se houver arquivos e mensagem do usuário)
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
    agentName: agent.name,
    summary: conversation.summary,
    contactName: contact.name,
    currentStepOrder: conversation.currentStepOrder,
    estimatedTokens,
    toolsEnabled: agent.toolsEnabled,
    pipelineIds: agent.pipelineIds,
    knowledgeContext,
    currentStepAllowedActions,
  }
}
