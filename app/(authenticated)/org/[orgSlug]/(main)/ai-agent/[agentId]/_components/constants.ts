export const MODEL_OPTIONS = [
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
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
