import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import { getRuntimeToolName } from '../../../../../trigger/tools/lib/runtime-tool-name'

/**
 * Labels em pt-BR para cada tool — usados no retorno do mock
 * para que o frontend renderize cards com nome amigável.
 */
const TOOL_LABELS: Record<string, string> = {
  move_deal: 'Mover Negócio',
  update_contact: 'Atualizar Contato',
  update_deal: 'Atualizar Negócio',
  create_task: 'Criar Tarefa',
  list_availability: 'Consultar Disponibilidade',
  create_event: 'Criar Evento',
  update_event: 'Reagendar Evento',
  hand_off_to_human: 'Envolver Humano',
  search_products: 'Buscar Produtos',
  send_product_media: 'Enviar Midia do Produto',
  send_media: 'Enviar Midia',
}

/**
 * Helper para formatar duração em minutos para label legível
 */
function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

/**
 * Cria um resultado mock padronizado para todas as tools simuladas.
 */
function mockResult(toolName: string, input: Record<string, unknown>, message: string) {
  // Resolver o label canônico: remover sufixo de índice (ex: move_deal_1 → move_deal)
  const canonicalName = toolName.replace(/_\d+$/, '')
  return {
    success: true,
    simulated: true,
    action: toolName,
    label: TOOL_LABELS[canonicalName] ?? toolName,
    input,
    message,
  }
}

/**
 * Agrupa step actions por type, preservando a ordem original.
 * A ordem importa para o índice de naming determinístico.
 */
function groupActionsByType(actions: StepAction[]): Map<string, StepAction[]> {
  const byType = new Map<string, StepAction[]>()
  for (const action of actions) {
    const list = byType.get(action.type) ?? []
    list.push(action)
    byType.set(action.type, list)
  }
  return byType
}

/**
 * Constrói um Record<string, tool> com TODOS os tools habilitados do agente,
 * usando os mesmos inputSchema da produção e `execute` mockado (zero side-effects).
 *
 * O `search_knowledge` NÃO é incluído aqui — ele continua como tool real
 * e é adicionado separadamente no route.ts.
 *
 * Suporta múltiplas instâncias do mesmo type: nomes runtime determinísticos
 * via getRuntimeToolName (ex: move_deal_0, move_deal_1 quando há 2 instâncias).
 */
export function buildMockToolSet(
  toolsEnabled: string[],
  allStepActions: StepAction[],
): ToolSet {
  const tools: ToolSet = {}
  const stepActionsByType = groupActionsByType(allStepActions)

  for (const toolName of toolsEnabled) {
    // search_knowledge é mantido como tool real — não incluir no mock
    if (toolName === 'search_knowledge') continue

    if (toolName === 'move_deal') {
      const configs = stepActionsByType.get('move_deal') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          const runtimeName = getRuntimeToolName('move_deal', indexInGroup, groupSize)
          const triggerHint = config.trigger
          const description = triggerHint
            ? `Move um negócio para outra etapa do pipeline de vendas.\n\nQuando usar esta instância: ${triggerHint}`
            : 'Move um negócio para outra etapa do pipeline de vendas. Use quando o cliente avançar ou regredir no funil.'
          tools[runtimeName] = tool({
            description,
            inputSchema: z.object({
              targetStageId: z
                .string()
                .describe('ID (UUID) da etapa de destino no pipeline.'),
            }),
            execute: async (input) =>
              mockResult(runtimeName, input, 'Negócio movido para a etapa selecionada.'),
          })
        })
      } else {
        tools[toolName] = tool({
          description:
            'Move um negócio para outra etapa do pipeline de vendas. Use quando o cliente avançar ou regredir no funil.',
          inputSchema: z.object({
            targetStageId: z
              .string()
              .describe('ID (UUID) da etapa de destino no pipeline.'),
          }),
          execute: async (input) =>
            mockResult('move_deal', input, 'Negócio movido para a etapa selecionada.'),
        })
      }
      continue
    }

    if (toolName === 'update_contact') {
      const configs = stepActionsByType.get('update_contact') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const baseDescription =
        'Atualiza dados de um contato (nome, email, telefone, cargo). Use quando o cliente fornecer informações novas sobre si.'
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          const runtimeName = getRuntimeToolName('update_contact', indexInGroup, groupSize)
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema: z.object({
              name: z.string().optional().describe('Nome completo do contato'),
              email: z.string().email().optional().describe('Email do contato'),
              phone: z.string().optional().describe('Telefone do contato'),
              role: z.string().optional().describe('Cargo/função do contato'),
            }),
            execute: async (input) => {
              const fields = Object.keys(input).filter(
                (key) => input[key as keyof typeof input] !== undefined,
              )
              return mockResult(runtimeName, input, `Campos atualizados: ${fields.join(', ')}.`)
            },
          })
        })
      } else {
        tools[toolName] = tool({
          description: baseDescription,
          inputSchema: z.object({
            name: z.string().optional().describe('Nome completo do contato'),
            email: z.string().email().optional().describe('Email do contato'),
            phone: z.string().optional().describe('Telefone do contato'),
            role: z.string().optional().describe('Cargo/função do contato'),
          }),
          execute: async (input) => {
            const fields = Object.keys(input).filter(
              (key) => input[key as keyof typeof input] !== undefined,
            )
            return mockResult('update_contact', input, `Campos atualizados: ${fields.join(', ')}.`)
          },
        })
      }
      continue
    }

    if (toolName === 'update_deal') {
      const configs = stepActionsByType.get('update_deal') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const baseDescription =
        'Atualiza dados de um negócio (título, valor, prioridade, previsão de fechamento, notas). Use quando o cliente informar valor, prazo ou novas informações sobre o negócio.'
      const inputSchema = z.object({
        title: z.string().optional().describe('Novo título do negócio'),
        value: z
          .number()
          .min(0)
          .optional()
          .describe('Valor do negócio em reais (ex: 15000)'),
        priority: z
          .enum(['low', 'medium', 'high', 'urgent'])
          .optional()
          .describe('Prioridade do negócio'),
        expectedCloseDate: z
          .string()
          .optional()
          .describe('Previsão de fechamento ISO 8601 (ex: 2026-04-15T00:00:00)'),
        notes: z
          .string()
          .optional()
          .describe('Notas a adicionar ao negócio (concatenadas com notas existentes)'),
      })
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          const runtimeName = getRuntimeToolName('update_deal', indexInGroup, groupSize)
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema,
            execute: async (input) => {
              const fields = Object.keys(input).filter(
                (key) => input[key as keyof typeof input] !== undefined,
              )
              return mockResult(runtimeName, input, `Negócio atualizado: ${fields.join(', ')}.`)
            },
          })
        })
      } else {
        tools[toolName] = tool({
          description: baseDescription,
          inputSchema,
          execute: async (input) => {
            const fields = Object.keys(input).filter(
              (key) => input[key as keyof typeof input] !== undefined,
            )
            return mockResult('update_deal', input, `Negócio atualizado: ${fields.join(', ')}.`)
          },
        })
      }
      continue
    }

    if (toolName === 'create_task') {
      const configs = stepActionsByType.get('create_task') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const baseDescription =
        'Cria uma tarefa de follow-up vinculada ao negócio. Use quando combinar algo com o cliente (ex: enviar proposta, agendar reunião).'
      const inputSchema = z.object({
        title: z.string().describe('Título descritivo da tarefa'),
        dueDate: z
          .string()
          .describe('Data de vencimento no formato ISO 8601 (ex: 2026-03-01T14:00:00)'),
      })
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          const runtimeName = getRuntimeToolName('create_task', indexInGroup, groupSize)
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema,
            execute: async (input) =>
              mockResult(runtimeName, input, `Tarefa "${input.title}" criada com sucesso.`),
          })
        })
      } else {
        tools[toolName] = tool({
          description: baseDescription,
          inputSchema,
          execute: async (input) =>
            mockResult('create_task', input, `Tarefa "${input.title}" criada com sucesso.`),
        })
      }
      continue
    }

    if (toolName === 'list_availability') {
      const configs = stepActionsByType.get('list_availability') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const availabilityInputSchema = z.object({
        date: z
          .string()
          .optional()
          .describe(
            'Data específica no formato YYYY-MM-DD (ex: 2026-07-19). Se omitido, lista os próximos dias.',
          ),
        time: z
          .string()
          .optional()
          .describe(
            'Horário específico no formato HH:MM (ex: 10:00). Usar junto com date para checar um slot exato.',
          ),
      })
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          if (config.type !== 'list_availability') return
          const runtimeName = getRuntimeToolName('list_availability', indexInGroup, groupSize)
          const baseDescription = `Consulta horários disponíveis na agenda. Configuração: ${config.daysAhead} dias à frente, slots de ${config.slotDuration}min, entre ${config.startTime} e ${config.endTime}.`
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema: availabilityInputSchema,
            execute: async (input) =>
              mockResult(
                runtimeName,
                input,
                input.date && input.time
                  ? `O horário ${input.time} de ${input.date} está DISPONÍVEL.`
                  : 'Encontrei 5 horário(s) disponível(is) nos próximos dias.',
              ),
          })
        })
      } else {
        tools[toolName] = tool({
          description:
            'Consulta horários disponíveis na agenda. Use ANTES de sugerir horários ao cliente.',
          inputSchema: availabilityInputSchema,
          execute: async (input) =>
            mockResult(
              'list_availability',
              input,
              input.date && input.time
                ? `O horário ${input.time} de ${input.date} está DISPONÍVEL.`
                : 'Encontrei 5 horário(s) disponível(is) nos próximos dias.',
            ),
        })
      }
      continue
    }

    if (toolName === 'create_event') {
      const configs = stepActionsByType.get('create_event') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const eventInputSchema = z.object({
        title: z
          .string()
          .describe('Título do evento seguindo as instruções fornecidas'),
        description: z
          .string()
          .optional()
          .describe('Descrição ou pauta do evento'),
        startDate: z
          .string()
          .describe(
            'Data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00)',
          ),
      })
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          if (config.type !== 'create_event') return
          const runtimeName = getRuntimeToolName('create_event', indexInGroup, groupSize)
          const durationLabel = formatDurationLabel(config.duration)
          const baseDescription =
            `Agenda um evento vinculado ao negócio. Para o título, siga estas instruções: ${config.titleInstructions}. ` +
            `O evento terá duração de ${durationLabel}. ` +
            `Somente agende horários entre ${config.startTime} e ${config.endTime} (horário de Brasília). ` +
            `Não agende eventos fora desse intervalo.`
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema: eventInputSchema,
            execute: async (input) =>
              mockResult(runtimeName, input, `Evento "${input.title}" agendado com sucesso.`),
          })
          // Registrar update_event apenas se allowReschedule estiver habilitado
          if (config.allowReschedule) {
            tools['update_event'] = tool({
              description:
                'Reagenda um evento existente para nova data/hora. Use quando o cliente solicitar mudança de horário.',
              inputSchema: z.object({
                appointmentId: z
                  .string()
                  .describe('ID do evento a ser reagendado'),
                newStartDate: z
                  .string()
                  .describe(
                    'Nova data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00)',
                  ),
              }),
              execute: async (input) =>
                mockResult('update_event', input, 'Evento reagendado com sucesso.'),
            })
          }
        })
      } else {
        tools[toolName] = tool({
          description: 'Agenda um evento vinculado ao negócio.',
          inputSchema: eventInputSchema,
          execute: async (input) =>
            mockResult('create_event', input, `Evento "${input.title}" agendado com sucesso.`),
        })
      }
      continue
    }

    // update_event solo (caso já tenha sido adicionado via create_event, pula)
    if (toolName === 'update_event') {
      if (!tools['update_event']) {
        tools['update_event'] = tool({
          description:
            'Reagenda um evento existente para nova data/hora. Use quando o cliente solicitar mudança de horário.',
          inputSchema: z.object({
            appointmentId: z
              .string()
              .describe('ID do evento a ser reagendado'),
            newStartDate: z
              .string()
              .describe(
                'Nova data/hora início ISO 8601 com fuso horário de Brasília (ex: 2026-03-10T14:00:00-03:00)',
              ),
          }),
          execute: async (input) =>
            mockResult('update_event', input, 'Evento reagendado com sucesso.'),
        })
      }
      continue
    }

    if (toolName === 'hand_off_to_human') {
      const configs = stepActionsByType.get('hand_off_to_human') ?? []
      const groupSize = configs.length > 0 ? configs.length : 1
      const handOffInputSchema = z.object({
        mode: z
          .enum(['transfer', 'notify'])
          .default('transfer')
          .describe(
            '"transfer": pausa a IA e entrega o controle ao atendente. ' +
            '"notify": NÃO pausa a IA — notifica o responsável sobre uma dúvida pontual enquanto você continua atendendo.',
          ),
        reason: z
          .string()
          .describe('Motivo da notificação/transferência. No modo "notify", descreva a dúvida específica. No modo "transfer", descreva por que a IA não deve mais conduzir.'),
      })
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          if (config.type !== 'hand_off_to_human') return
          const runtimeName = getRuntimeToolName('hand_off_to_human', indexInGroup, groupSize)
          const hasNotification = config.notifyTarget !== 'none'
          const baseDescription = hasNotification
            ? 'Envolve um humano no atendimento e envia notificação. mode=transfer pausa a IA; mode=notify mantém a IA ativa e apenas notifica o responsável.'
            : 'Envolve um humano no atendimento. mode=transfer pausa a IA; mode=notify mantém a IA ativa e apenas notifica o responsável.'
          const description = config.trigger
            ? `${baseDescription}\n\nQuando usar esta instância: ${config.trigger}`
            : baseDescription
          tools[runtimeName] = tool({
            description,
            inputSchema: handOffInputSchema,
            execute: async (input) =>
              mockResult(
                runtimeName,
                input,
                input.mode === 'transfer'
                  ? 'Conversa transferida para atendimento humano.'
                  : 'Responsável notificado. IA continua atendendo.',
              ),
          })
        })
      } else {
        tools[toolName] = tool({
          description:
            'Envolve um humano no atendimento. mode=transfer pausa a IA; mode=notify mantém a IA ativa e apenas notifica o responsável.',
          inputSchema: handOffInputSchema,
          execute: async (input) =>
            mockResult(
              'hand_off_to_human',
              input,
              input.mode === 'transfer'
                ? 'Conversa transferida para atendimento humano.'
                : 'Responsável notificado. IA continua atendendo.',
            ),
        })
      }
      continue
    }

    // Tools globais de produtos — adicionadas quando presentes em toolsEnabled
    if (toolName === 'search_products') {
      tools[toolName] = tool({
        description:
          'Busca produtos no catalogo da empresa por nome, tipo ou caracteristicas. Use quando o cliente perguntar sobre produtos, precos ou opcoes disponiveis.',
        inputSchema: z.object({
          query: z.string().describe(
            'Termo de busca para encontrar produtos (ex: nome do produto, tipo, caracteristica)',
          ),
        }),
        execute: async (input) =>
          mockResult('search_products', input, 'Encontrados 3 produto(s) no catálogo.'),
      })
      continue
    }

    if (toolName === 'send_product_media') {
      tools[toolName] = tool({
        description:
          'Envia fotos e videos de um produto para o cliente via WhatsApp. Use apos encontrar o produto com search_products, quando o cliente quiser ver fotos ou detalhes visuais.',
        inputSchema: z.object({
          productId: z.string().describe(
            'ID do produto cujas fotos/videos devem ser enviadas ao cliente. Obtenha o ID via search_products.',
          ),
        }),
        execute: async (input) =>
          mockResult('send_product_media', input, '2 mídia(s) enviada(s) com sucesso. (simulado — nenhum arquivo real foi enviado)'),
      })
      continue
    }

    if (toolName === 'send_media') {
      tools[toolName] = tool({
        description:
          'Envia uma imagem, video ou documento de uma URL publica diretamente ao cliente via WhatsApp.',
        inputSchema: z.object({
          url: z.string().url().describe('URL publica da midia a ser enviada.'),
          type: z
            .enum(['image', 'video', 'document'])
            .optional()
            .describe('Tipo da midia (inferido automaticamente se nao informado).'),
          caption: z
            .string()
            .optional()
            .describe('Legenda opcional.'),
        }),
        execute: async (input) =>
          mockResult(
            'send_media',
            input,
            'Midia enviada com sucesso. (simulado — nenhum arquivo real foi enviado)',
          ),
      })
      continue
    }
  }

  return tools
}
