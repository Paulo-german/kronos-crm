export const MODEL_OPTIONS = [
  { value: 'openai/gpt-5.2', label: 'GPT 5.2' },
  { value: 'openai/gpt-4.1-mini', label: 'GPT 4.1 Mini' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
] as const

export const TOOL_OPTIONS = [
  {
    value: 'move_deal',
    label: 'Mover Negócio',
    description: 'Move negócios entre etapas do pipeline',
  },
  {
    value: 'update_contact',
    label: 'Atualizar Contato',
    description: 'Atualiza dados do contato (nome, email, telefone)',
  },
  {
    value: 'create_task',
    label: 'Criar Tarefa',
    description: 'Cria tarefas no CRM vinculadas ao negócio',
  },
  {
    value: 'hand_off_to_human',
    label: 'Transferir para Humano',
    description: 'Pausa a IA e notifica um atendente humano',
  },
  {
    value: 'search_knowledge',
    label: 'Buscar Conhecimento',
    description: 'Busca na base de conhecimento do agente',
  },
] as const
