import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

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

export const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
] as const

export const DAY_LABELS: Record<keyof BusinessHoursConfig, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
} as const

export const DAY_KEYS: (keyof BusinessHoursConfig)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const DEFAULT_BUSINESS_HOURS_CONFIG: BusinessHoursConfig = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: false, start: '09:00', end: '13:00' },
  sunday: { enabled: false, start: '09:00', end: '13:00' },
}
