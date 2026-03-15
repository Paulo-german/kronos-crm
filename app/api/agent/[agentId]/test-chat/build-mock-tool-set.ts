import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

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
  hand_off_to_human: 'Transferir para Humano',
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
  return {
    success: true,
    simulated: true,
    action: toolName,
    label: TOOL_LABELS[toolName] ?? toolName,
    input,
    message,
  }
}

/**
 * Constrói um Record<string, tool> com TODOS os tools habilitados do agente,
 * usando os mesmos inputSchema da produção e `execute` mockado (zero side-effects).
 *
 * O `search_knowledge` NÃO é incluído aqui — ele continua como tool real
 * e é adicionado separadamente no route.ts.
 */
export function buildMockToolSet(
  toolsEnabled: string[],
  allStepActions: StepAction[],
): ToolSet {
  const tools: ToolSet = {}

  for (const toolName of toolsEnabled) {
    // search_knowledge é mantido como tool real — não incluir no mock
    if (toolName === 'search_knowledge') continue

    if (toolName === 'move_deal') {
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
      continue
    }

    if (toolName === 'update_contact') {
      tools[toolName] = tool({
        description:
          'Atualiza dados de um contato (nome, email, telefone, cargo). Use quando o cliente fornecer informações novas sobre si.',
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
          return mockResult(
            'update_contact',
            input,
            `Campos atualizados: ${fields.join(', ')}.`,
          )
        },
      })
      continue
    }

    if (toolName === 'update_deal') {
      tools[toolName] = tool({
        description:
          'Atualiza dados de um negócio (título, valor, prioridade, previsão de fechamento, notas, status). Use quando o cliente informar valor, prazo, ou quando o negócio for ganho ou perdido.',
        inputSchema: z.object({
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
          status: z
            .enum(['WON', 'LOST'])
            .optional()
            .describe('Marcar negócio como ganho (WON) ou perdido (LOST)'),
          reason: z
            .string()
            .optional()
            .describe(
              'Motivo da perda (quando status = LOST). Use exatamente um dos motivos listados em [Motivos de perda disponíveis] no system prompt.',
            ),
        }),
        execute: async (input) => {
          const fields = Object.keys(input).filter(
            (key) => input[key as keyof typeof input] !== undefined,
          )
          return mockResult(
            'update_deal',
            input,
            `Negócio atualizado: ${fields.join(', ')}.`,
          )
        },
      })
      continue
    }

    if (toolName === 'create_task') {
      tools[toolName] = tool({
        description:
          'Cria uma tarefa de follow-up vinculada ao negócio. Use quando combinar algo com o cliente (ex: enviar proposta, agendar reunião).',
        inputSchema: z.object({
          title: z.string().describe('Título descritivo da tarefa'),
          dueDate: z
            .string()
            .describe('Data de vencimento no formato ISO 8601 (ex: 2026-03-01T14:00:00)'),
        }),
        execute: async (input) =>
          mockResult('create_task', input, `Tarefa "${input.title}" criada com sucesso.`),
      })
      continue
    }

    if (toolName === 'list_availability') {
      const config = allStepActions.find(
        (action) => action.type === 'list_availability',
      )
      const description =
        config && config.type === 'list_availability'
          ? `Consulta horários disponíveis na agenda. Configuração: ${config.daysAhead} dias à frente, slots de ${config.slotDuration}min, entre ${config.startTime} e ${config.endTime}.`
          : 'Consulta horários disponíveis na agenda. Use ANTES de sugerir horários ao cliente.'
      tools[toolName] = tool({
        description,
        inputSchema: z.object({}),
        execute: async () =>
          mockResult('list_availability', {}, 'Encontrei 5 horário(s) disponível(is) nos próximos dias.'),
      })
      continue
    }

    if (toolName === 'create_event') {
      const config = allStepActions.find(
        (action) => action.type === 'create_event',
      )
      let description =
        'Agenda um evento vinculado ao negócio.'
      if (config && config.type === 'create_event') {
        const durationLabel = formatDurationLabel(config.duration)
        description =
          `Agenda um evento vinculado ao negócio. Para o título, siga estas instruções: ${config.titleInstructions}. ` +
          `O evento terá duração de ${durationLabel}. ` +
          `Somente agende horários entre ${config.startTime} e ${config.endTime} (horário de Brasília). ` +
          `Não agende eventos fora desse intervalo.`
      }
      tools[toolName] = tool({
        description,
        inputSchema: z.object({
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
        }),
        execute: async (input) =>
          mockResult('create_event', input, `Evento "${input.title}" agendado com sucesso.`),
      })

      // Registrar update_event apenas se allowReschedule estiver habilitado
      if (config && config.type === 'create_event' && config.allowReschedule) {
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
      const config = allStepActions.find(
        (action) => action.type === 'hand_off_to_human',
      )
      const description =
        config && config.type === 'hand_off_to_human' && config.notifyTarget !== 'none'
          ? 'Transfere a conversa para um atendente humano e envia notificação. Use quando o cliente solicitar falar com uma pessoa, quando não souber responder, ou em situações delicadas.'
          : 'Transfere a conversa para um atendente humano. Use quando o cliente solicitar falar com uma pessoa, quando não souber responder, ou em situações delicadas.'
      tools[toolName] = tool({
        description,
        inputSchema: z.object({
          reason: z
            .string()
            .describe('Motivo da transferência (ex: "Cliente solicitou atendimento humano")'),
        }),
        execute: async (input) =>
          mockResult('hand_off_to_human', input, 'Conversa transferida para atendimento humano.'),
      })
      continue
    }
  }

  return tools
}
