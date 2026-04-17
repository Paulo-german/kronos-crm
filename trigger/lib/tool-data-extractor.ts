import type { ToolDataForResponder } from './two-phase-types'

// Mapeamento fixo de toolName → tópico semântico para erros estruturados.
// Mantido como constante em vez de Record<string, Topic> para preservar type safety.
type ErrorTopic = 'scheduling' | 'products' | 'knowledge' | 'crm' | 'other'

const TOOL_TOPIC_MAP: Readonly<Record<string, ErrorTopic>> = {
  list_availability: 'scheduling',
  create_event: 'scheduling',
  update_event: 'scheduling',
  search_products: 'products',
  search_knowledge: 'knowledge',
  move_deal: 'crm',
  update_deal: 'crm',
  create_deal: 'crm',
  update_contact: 'crm',
  create_task: 'crm',
}

// Tools cujo sucesso/falha pode exigir handoff humano imediato.
// São as tools que bloqueiam o fluxo de venda caso falhem permanentemente.
const CRITICAL_TOOLS_FOR_HANDOFF = new Set<string>([
  'create_event',
  'update_event',
])

export interface ToolStep {
  toolCalls: Array<{
    toolName: string
    toolCallId: string
    args: unknown
  }>
  toolResults: Array<{
    toolName: string
    toolCallId: string
    result: unknown
  }>
}

export interface ExtractorCallbacks {
  onToolError?: (toolName: string, error: unknown) => void
}

// --- Type guards defensivos ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'string'
}

function isNumberField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'number'
}

// Verifica se um result de tool indica falha estruturada.
// As tools do projeto retornam { success: boolean, message: string } como padrão.
function isToolFailure(result: unknown): boolean {
  if (!isRecord(result)) return false
  if (result['success'] === false) return true
  if (typeof result['error'] === 'string' && result['error'].length > 0) return true
  return false
}

function extractFailureReason(result: unknown): string {
  if (!isRecord(result)) return 'Erro desconhecido'
  if (typeof result['message'] === 'string' && result['message'].length > 0) {
    return result['message']
  }
  if (typeof result['error'] === 'string' && result['error'].length > 0) {
    return result['error']
  }
  return 'Erro desconhecido'
}

// Determina se um erro é recuperável (transitório) ou permanente.
// Heurística baseada no texto da mensagem de erro retornado pelas tools.
function isRecoverable(reason: string): boolean {
  const permanentMarkers = [
    'não encontrado',
    'sem permissão',
    'nenhum negócio vinculado',
    'não pertence',
    'inválid',
  ]
  const lowerReason = reason.toLowerCase()
  return !permanentMarkers.some((marker) => lowerReason.includes(marker))
}

// --- Extratores por toolName ---

function extractListAvailability(
  result: unknown,
): Pick<ToolDataForResponder, 'availableSlots'> {
  if (!isRecord(result)) return {}
  const rawSlots = result['slots']
  if (!Array.isArray(rawSlots)) return {}

  const availableSlots = rawSlots
    .filter((slot): slot is Record<string, unknown> => isRecord(slot))
    .filter(
      (slot) =>
        isStringField(slot, 'date') &&
        isStringField(slot, 'startTime') &&
        isStringField(slot, 'endTime'),
    )
    .map((slot) => ({
      date: slot['date'] as string,
      startTime: slot['startTime'] as string,
      endTime: slot['endTime'] as string,
    }))

  if (availableSlots.length === 0) return {}
  return { availableSlots }
}

// Para create_event: o tool result atual retorna apenas { success, message }.
// O id do appointment criado não é retornado pela tool — gap arquitetural que
// será resolvido quando a tool for atualizada para retornar o id (ver PLAN §4.1).
// Enquanto isso, o id é extraído dos args do toolCall quando disponível via update_event.
// Para create_event, populamos startDate a partir dos args para minimizar perda de dados.
function extractCreateEvent(
  result: unknown,
  args: unknown,
): Pick<ToolDataForResponder, 'appointmentConfirmed'> {
  if (!isRecord(result)) return {}

  const argsRecord = isRecord(args) ? args : {}
  const startDate =
    isStringField(argsRecord, 'startDate') ? (argsRecord['startDate'] as string) : ''

  return {
    appointmentConfirmed: {
      // id não disponível no resultado atual de create_event — string vazia como
      // indicador de indisponibilidade. Agent 2 não usa o id para redigir a resposta.
      id: '',
      operation: 'created',
      startDate,
      endDate: '',
      title:
        isRecord(argsRecord) && isStringField(argsRecord, 'title')
          ? (argsRecord['title'] as string)
          : undefined,
    },
  }
}

function extractUpdateEvent(
  result: unknown,
  args: unknown,
): Pick<ToolDataForResponder, 'appointmentConfirmed'> {
  if (!isRecord(result)) return {}

  const argsRecord = isRecord(args) ? args : {}
  const appointmentId =
    isStringField(argsRecord, 'appointmentId') ? (argsRecord['appointmentId'] as string) : ''
  const startDate =
    isStringField(argsRecord, 'newStartDate') ? (argsRecord['newStartDate'] as string) : ''

  return {
    appointmentConfirmed: {
      id: appointmentId,
      operation: 'updated',
      startDate,
      // endDate recalculado a partir do newStartDate + duração original — não disponível
      // no resultado da tool. Agent 2 usa startDate para confirmar ao cliente.
      endDate: '',
    },
  }
}

type ProductEntry = {
  id: string
  name: string
  price?: number
  shortDescription?: string
  media?: Array<{
    url: string
    type: 'image' | 'video' | 'document'
    label?: string
  }>
}

function extractSearchProducts(
  result: unknown,
): Pick<ToolDataForResponder, 'products'> {
  if (!isRecord(result)) return {}
  const rawProducts = result['products']
  if (!Array.isArray(rawProducts)) return {}

  const products = rawProducts
    .filter((product): product is Record<string, unknown> => isRecord(product))
    .filter(
      (product) =>
        isStringField(product, 'id') && isStringField(product, 'name'),
    )
    .map((product): ProductEntry => {
      const mapped: ProductEntry = {
        id: product['id'] as string,
        name: product['name'] as string,
      }

      if (isNumberField(product, 'price')) {
        mapped.price = product['price'] as number
      }

      // A tool search_products retorna apenas hasMedia:boolean — URLs reais de
      // mídia precisam de join com ProductMedia no banco. Este join é
      // responsabilidade do orquestrador antes de chamar extractToolDataForResponder,
      // ou da tool ser atualizada para retornar media[]. O extrator preserva
      // qualquer array media[] que venha no result para forward-compatibility.
      if (Array.isArray(product['media'])) {
        const validMedia = (product['media'] as unknown[])
          .filter((item): item is Record<string, unknown> => isRecord(item))
          .filter(
            (item) =>
              isStringField(item, 'url') &&
              isStringField(item, 'type') &&
              (item['type'] === 'image' ||
                item['type'] === 'video' ||
                item['type'] === 'document'),
          )
          .map((item) => ({
            url: item['url'] as string,
            type: item['type'] as 'image' | 'video' | 'document',
            label:
              isStringField(item, 'label') ? (item['label'] as string) : undefined,
          }))

        if (validMedia.length > 0) {
          mapped.media = validMedia
        }
      }

      if (typeof product['description'] === 'string') {
        mapped.shortDescription = product['description']
      } else if (isStringField(product, 'shortDescription')) {
        mapped.shortDescription = product['shortDescription'] as string
      }

      return mapped
    })

  if (products.length === 0) return {}
  return { products }
}

// --- Função principal ---

/**
 * Extrai dados factuais dos resultados de tools do Agent 1 e os transforma em
 * ToolDataForResponder para consumo pelo Agent 2.
 *
 * Regras de roteamento:
 * - list_availability → availableSlots
 * - create_event / update_event → appointmentConfirmed
 * - search_products → products (media[] preservado se presente no result)
 * - Demais tools → apenas trace/log (não populam dataFromTools)
 *
 * Função pura — sem I/O, sem DB, sem lançamento de exceção.
 */
export function extractToolDataForResponder(
  steps: ToolStep[],
  callbacks?: ExtractorCallbacks,
): ToolDataForResponder {
  const data: ToolDataForResponder = {}

  for (const step of steps) {
    // Indexar toolCalls por toolCallId para acesso aos args durante extração
    const argsById = new Map<string, unknown>()
    for (const call of step.toolCalls) {
      argsById.set(call.toolCallId, call.args)
    }

    for (const toolResult of step.toolResults) {
      const { toolName, toolCallId, result } = toolResult
      const args = argsById.get(toolCallId)

      // Erro estruturado: qualquer tool pode falhar
      if (isToolFailure(result)) {
        const reason = extractFailureReason(result)
        const recoverable = isRecoverable(reason)
        const topic: ErrorTopic = TOOL_TOPIC_MAP[toolName] ?? 'other'

        const errorEntry: NonNullable<ToolDataForResponder['errors']>[number] = {
          tool: toolName,
          topic,
          reason,
          recoverable,
        }

        // Hint de fallback para tools de agendamento — permite ao Agent 2 pivotar
        if (topic === 'scheduling') {
          errorEntry.suggestedFallback =
            'Peça ao cliente que sugira outro horário ou entre em contato diretamente.'
        }

        data.errors = [...(data.errors ?? []), errorEntry]

        // Tool crítica com falha permanente aciona handoff humano
        if (!recoverable && CRITICAL_TOOLS_FOR_HANDOFF.has(toolName)) {
          data.requiresHumanHandoff = true
        }

        callbacks?.onToolError?.(toolName, result)
        continue
      }

      // Roteamento bem-sucedido por toolName
      switch (toolName) {
        case 'list_availability': {
          const extracted = extractListAvailability(result)
          if (extracted.availableSlots) {
            // Acumula slots de múltiplas chamadas de list_availability no mesmo turn
            data.availableSlots = [
              ...(data.availableSlots ?? []),
              ...extracted.availableSlots,
            ]
          }
          break
        }

        case 'create_event': {
          // Última chamada bem-sucedida de create_event vence (último agendamento)
          const extracted = extractCreateEvent(result, args)
          if (extracted.appointmentConfirmed) {
            data.appointmentConfirmed = extracted.appointmentConfirmed
          }
          break
        }

        case 'update_event': {
          const extracted = extractUpdateEvent(result, args)
          if (extracted.appointmentConfirmed) {
            data.appointmentConfirmed = extracted.appointmentConfirmed
          }
          break
        }

        case 'search_products': {
          const extracted = extractSearchProducts(result)
          if (extracted.products) {
            // Acumula produtos de múltiplas chamadas de search_products
            data.products = [...(data.products ?? []), ...extracted.products]
          }
          break
        }

        // Tools de CRM e controle de fluxo: apenas trace/log via ToolAgentTrace.
        // Não populam dataFromTools — o Agent 2 não precisa saber que ocorreram.
        case 'move_deal':
        case 'update_deal':
        case 'create_deal':
        case 'update_contact':
        case 'create_task':
        case 'hand_off_to_human':
        case 'transfer_to_agent':
          break

        // Tool desconhecida: ignorada silenciosamente para forward-compatibility
        default:
          break
      }
    }
  }

  return data
}
