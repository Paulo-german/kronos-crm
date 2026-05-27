// Constantes compartilhadas do pipeline single-v2.
// Centralizadas aqui para ficarem visíveis e configuráveis sem abrir o arquivo principal.

export const MESSAGE_HISTORY_LIMIT = 50

export const KNOWN_TOOL_NAMES = new Set([
  'move_deal',
  'update_contact',
  'update_deal',
  'create_task',
  'search_knowledge',
  'list_availability',
  'create_event',
  'update_event',
  'hand_off_to_human',
  'search_products',
  'send_product_media',
  'send_media',
  'transfer_to_agent',
])

// Idêntico a tool-agent.ts:24-31 — executadas com sucesso uma vez, não devem repetir no mesmo turno.
export const IDEMPOTENT_TOOL_NAMES = [
  'update_deal',
  'move_deal',
  'update_contact',
  'update_event',
  'hand_off_to_human',
  'transfer_to_agent',
] as const

export const MAX_OUTPUT_TOKENS = 3072
export const LLM_TEMPERATURE = 0.5

// Quantas mensagens recentes vão ao classificador. 6 cobre 3 turnos de
// conversa (user→assistant), suficiente para inferir a etapa atual sem
// inflar o prompt.
export const CLASSIFIER_HISTORY_TURNS = 6

// Classificador só precisa devolver um UUID — 64 tokens é mais do que suficiente.
export const CLASSIFIER_MAX_OUTPUT_TOKENS = 64

// Diretiva injetada apenas no system prompt da Call 1 para evitar que o modelo
// gaste tokens gerando texto que será descartado (o texto final é responsabilidade do Responder).
export const CALL1_EXECUTION_DIRECTIVE =
  '\n\n## Modo de execução deste turno\n' +
  'Sua única responsabilidade agora é identificar e executar as ferramentas ' +
  'necessárias para atender o cliente. NÃO gere texto de resposta — a mensagem ' +
  'final ao cliente será produzida em uma etapa separada com base nos resultados ' +
  'das suas ações. Apenas chame as ferramentas apropriadas.'

// Action tools: efeito colateral — Call 2 só precisa saber que foram executadas.
export const ACTION_TOOL_LABELS: Record<string, string> = {
  hand_off_to_human: 'Notificação de atendente humano enviada',
  move_deal: 'Negócio movido no pipeline',
  update_deal: 'Dados do negócio atualizados',
  update_contact: 'Dados do contato atualizados',
  create_task: 'Tarefa criada',
  create_event: 'Evento criado na agenda',
  update_event: 'Evento atualizado na agenda',
  transfer_to_agent: 'Transferência para agente iniciada',
  send_media: 'Mídia enviada',
  send_product_media: 'Mídia de produto enviada',
}

// Query tools: retornam conteúdo que o Call 2 precisa para gerar a resposta.
export const QUERY_TOOL_NAMES = new Set([
  'search_products',
  'search_knowledge',
  'list_availability',
])
