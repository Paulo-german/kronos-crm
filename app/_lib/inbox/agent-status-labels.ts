import type { AgentStatusState } from './agent-status-types'

// Mapeamento de nome de tool para label legível em PT-BR
const TOOL_LABELS: Record<string, string> = {
  list_availability: 'verificando disponibilidade',
  create_event: 'criando evento',
  update_event: 'atualizando evento',
  search_products: 'buscando produtos',
  search_knowledge: 'consultando base de conhecimento',
  send_product_media: 'enviando mídia do produto',
  send_media: 'enviando mídia',
  move_deal: 'movendo negócio',
  update_contact: 'atualizando contato',
  update_deal: 'atualizando negócio',
  create_task: 'criando tarefa',
  hand_off_to_human: 'transferindo para atendente',
  transfer_to_agent: 'transferindo para agente',
  // Sub-agentes do crew-v1
  tool_agent: 'executando ações',
  response_agent: 'elaborando resposta',
  leak_guardrail: 'validando resposta',
}

interface AgentStatusLabelArgs {
  state: AgentStatusState
  toolName?: string
  agentName?: string
}

export function getAgentStatusLabel(payload: AgentStatusLabelArgs): string {
  if (payload.state === 'idle') return ''

  const name = payload.agentName ?? 'Agente'

  if (payload.state === 'waiting') {
    return `${name} aguardando...`
  }

  if (payload.state === 'thinking') {
    return `${name} está pensando...`
  }

  if (payload.state === 'composing') {
    return `${name} está escrevendo...`
  }

  // running_tool
  if (payload.toolName) {
    const toolLabel = TOOL_LABELS[payload.toolName]
    if (toolLabel) {
      return `${name} está ${toolLabel}...`
    }
    return `${name} está executando ação...`
  }

  return `${name} está processando...`
}
