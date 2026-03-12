import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { searchKnowledge } from './utils/search-knowledge'
import { logger } from '@trigger.dev/sdk/v3'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import {
  ROLE_LABELS,
  TONE_INSTRUCTIONS,
  LENGTH_INSTRUCTIONS,
  LANGUAGE_INSTRUCTIONS,
} from '@/_actions/agent/shared/prompt-labels'
import { stepActionSchema, type StepAction } from '@/_actions/agent/shared/step-action-schema'

function compilePromptConfig(config: PromptConfig, agentName: string): string {
  const sections: string[] = []

  const roleName =
    config.role === 'custom'
      ? config.roleCustom || 'Assistente virtual'
      : ROLE_LABELS[config.role]
  sections.push(
    `Você é ${agentName}, ${roleName} da empresa ${config.companyName}.`,
  )

  sections.push(`\n## Sobre a Empresa\n${config.companyDescription}`)
  if (config.targetAudience) {
    sections.push(`Público-alvo: ${config.targetAudience}`)
  }

  const style = [
    `Tom de voz: ${TONE_INSTRUCTIONS[config.tone]}`,
    `Tamanho das respostas: ${LENGTH_INSTRUCTIONS[config.responseLength]}`,
    config.useEmojis
      ? 'Use emojis quando apropriado para tornar a conversa mais leve.'
      : 'Não use emojis nas respostas.',
    `Idioma: responda sempre em ${LANGUAGE_INSTRUCTIONS[config.language]}.`,
    '',
    'Formato de mensagens:',
    '- Use *negrito* com apenas um asterisco de cada lado.',
    '- Mantenha frases curtas e naturais, no máximo 120 caracteres por bloco.',
    '- NUNCA use listas com marcadores (-, *, •). Prefira mensagens corridas e naturais.',
    '- NUNCA use headers (#, ##), links em markdown [texto](url) ou formatação técnica.',
    '- Se a resposta for longa, divida em parágrafos curtos com linha em branco entre eles.',
    '- NUNCA comece respostas com "Entendi", "Compreendo", "Ótimo", "Perfeito", "Interessante". Vá direto ao ponto.',
    '- NUNCA mencione nomes técnicos de ferramentas (move_deal, update_contact, etc.) nas mensagens ao cliente.',
    '- Seja conversacional. Escreva como uma pessoa real escreveria, não como um relatório.',
  ]
  sections.push(`\n## Estilo e Formato de Comunicação\n${style.join('\n')}`)

  const ruleLines: string[] = []
  if (config.guidelines.length > 0) {
    ruleLines.push('**Diretrizes que você DEVE seguir:**')
    ruleLines.push(
      ...config.guidelines.map((guideline) => `- ${guideline}`),
    )
  }
  if (config.restrictions.length > 0) {
    if (ruleLines.length > 0) ruleLines.push('')
    ruleLines.push('**NUNCA faça:**')
    ruleLines.push(
      ...config.restrictions.map((restriction) => `- ${restriction}`),
    )
  }
  if (ruleLines.length > 0) {
    sections.push(`\n## Regras do Atendimento\n${ruleLines.join('\n')}`)
  }

  return sections.join('\n')
}

function compileStepActions(actions: StepAction[]): string[] {
  return actions.map((action) => {
    const { trigger } = action

    switch (action.type) {
      case 'move_deal':
        return `* ${trigger} → execute \`move_deal\` com targetStageId="${action.targetStage}".`
      case 'update_contact':
        return `* ${trigger} → execute \`update_contact\` para registrar no contato.`
      case 'update_deal': {
        const FIELD_LABELS: Record<string, string> = {
          title: 'título',
          value: 'valor em reais',
          priority: 'prioridade',
          expectedCloseDate: 'previsão de fechamento (ISO 8601)',
          notes: 'notas',
        }
        const PRIORITY_LABELS: Record<string, string> = {
          low: 'baixa',
          medium: 'média',
          high: 'alta',
          urgent: 'urgente',
        }

        const lines: string[] = []

        let instruction = `* ${trigger} → execute \`update_deal\``
        if (action.allowedFields.length > 0) {
          const fieldList = action.allowedFields.map((field) => FIELD_LABELS[field]).join(', ')
          instruction += ` atualizando apenas: ${fieldList}`
        }
        lines.push(instruction + '.')

        if (action.fixedPriority) {
          lines.push(
            `  → Prioridade OBRIGATÓRIA: "${PRIORITY_LABELS[action.fixedPriority]}" — não use outro valor.`,
          )
        }

        if (action.notesTemplate) {
          lines.push(`  → Para as notas, registre: ${action.notesTemplate}`)
        }

        if (action.allowedStatuses.length > 0) {
          const statusLabels = action.allowedStatuses
            .map((s) => (s === 'WON' ? 'GANHO (WON)' : 'PERDIDO (LOST)'))
            .join(' ou ')
          lines.push(`  → Pode alterar o status para: ${statusLabels}.`)
        } else {
          lines.push(`  → NÃO altere o status do negócio nesta etapa.`)
        }

        return lines.join('\n')
      }
      case 'create_task':
        return `* ${trigger} → execute \`create_task\` com título "${action.title}"${action.dueDaysOffset ? ` (vencimento em ${action.dueDaysOffset} dias)` : ''}.`
      case 'create_appointment':
        return `* ${trigger} → execute \`create_appointment\` com título "${action.title}".`
      case 'search_knowledge':
        return `* ${trigger} → execute \`search_knowledge\` para consultar a base.`
      case 'hand_off_to_human':
        return `* ${trigger} → execute \`hand_off_to_human\` para transferir.`
      default: {
        const _exhaustive: never = action
        throw new Error(`Tipo de ação desconhecido: ${(_exhaustive as StepAction).type}`)
      }
    }
  })
}

const TOOL_PROMPT_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  move_deal: {
    label: 'Mover Negócio',
    description: 'Move o negócio para outra etapa do pipeline quando a conversa progredir. Use conforme indicado nas etapas do processo.',
  },
  update_deal: {
    label: 'Atualizar Negócio',
    description: 'Registra informações coletadas no negócio (valor, notas, prioridade). Use para manter o negócio atualizado com dados da conversa.',
  },
  update_contact: {
    label: 'Atualizar Contato',
    description: 'Atualiza dados do contato (nome, email, telefone, cargo). Use quando o lead fornecer informações pessoais ou profissionais.',
  },
  create_task: {
    label: 'Criar Tarefa',
    description: 'Cria uma tarefa de follow-up ou ação futura. Use para garantir que próximos passos não se percam.',
  },
  create_appointment: {
    label: 'Criar Compromisso',
    description: 'Agenda um compromisso (reunião, visita, demo). Use quando confirmar horário com o lead.',
  },
  search_knowledge: {
    label: 'Consultar Base de Conhecimento',
    description: 'Busca informações na base de conhecimento do agente. Use para responder dúvidas sobre produtos, serviços, cases e materiais.',
  },
  hand_off_to_human: {
    label: 'Transferir para Humano',
    description: 'Transfere o atendimento para um atendente humano. Use quando o lead solicitar ou a situação fugir do seu escopo.',
  },
}

function compileToolsSection(toolsEnabled: string[]): string | null {
  const lines: string[] = []

  for (const toolKey of toolsEnabled) {
    const toolInfo = TOOL_PROMPT_DESCRIPTIONS[toolKey]
    if (!toolInfo) continue
    lines.push(`**${toolInfo.label}** (\`${toolKey}\`)`)
    lines.push(`Quando usar: ${toolInfo.description}`)
    lines.push('')
  }

  if (lines.length === 0) return null

  return `## Ferramentas Disponíveis\n\n${lines.join('\n').trimEnd()}`
}

interface BuildSystemPromptResult {
  systemPrompt: string
  modelId: string
  agentName: string
  summary: string | null
  contactName: string
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
 * 4. Dados do negócio (deal vinculado, se houver)
 * 5. Motivos de perda disponíveis (se update_deal habilitado)
 * 6. Processo de atendimento (etapas com ações imperativas)
 * 7. Busca RAG na base de conhecimento
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
    db.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: {
        summary: true,
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
            stage: { select: { name: true } },
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

  // Derivar conjunto de tools das actions de todos os steps
  const effectiveTools = [
    ...new Set(
      agent.steps.flatMap((step) => {
        const parsed = z.array(stepActionSchema).safeParse(step.actions)
        return parsed.success ? parsed.data.map((action) => action.type) : []
      }),
    ),
  ]

  const parts: string[] = []

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  // 1. Persona base (structured or legacy)
  const parsedConfig = promptConfigSchema.safeParse(agent.promptConfig)
  const promptConfig: PromptConfig | null = parsedConfig.success
    ? parsedConfig.data
    : null
  if (promptConfig) {
    parts.push(compilePromptConfig(promptConfig, agent.name))
    if (agent.systemPrompt.trim()) {
      parts.push(`\n[Instruções adicionais]\n${agent.systemPrompt}`)
    }
  } else {
    logger.warn('Invalid promptConfig, falling back to raw systemPrompt', {
      agentId,
      errors: parsedConfig.error?.flatten(),
    })
    parts.push(`Seu nome é ${agent.name}.\n\n${agent.systemPrompt}`)
  }

  // 2. Ferramentas disponíveis
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

  // 5. Dados do contato
  const contact = conversation.contact
  const contactFields = [
    `Nome: ${contact.name}`,
    contact.phone ? `Telefone: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.role ? `Cargo: ${contact.role}` : null,
  ].filter(Boolean)

  parts.push(`\n[Dados do contato]\n${contactFields.join('\n')}`)

  // 6. Dados do negócio (se houver deal vinculado)
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
  }

  // 7. Motivos de perda disponíveis (só se a tool update_deal está habilitada)
  if (lossReasons.length > 0 && effectiveTools.includes('update_deal')) {
    const reasonNames = lossReasons.map((r) => r.name)
    parts.push(
      `\n[Motivos de perda disponíveis]\nAo marcar um negócio como LOST, use o campo "reason" com um dos motivos abaixo (exatamente como escrito):\n${reasonNames.map((name) => `  • ${name}`).join('\n')}`,
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
    estimatedTokens,
    toolsEnabled: effectiveTools,
    pipelineIds: agent.pipelineIds,
    knowledgeContext,
  }
}
