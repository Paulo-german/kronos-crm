import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'

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
    value: 'update_deal',
    label: 'Atualizar Negócio',
    description: 'Atualiza título, valor, prioridade, previsão e status do negócio',
  },
  {
    value: 'create_task',
    label: 'Criar Tarefa',
    description: 'Cria tarefas no CRM vinculadas ao negócio',
  },
  {
    value: 'list_availability',
    label: 'Consultar Disponibilidade',
    description: 'Consulta horários disponíveis na agenda para sugerir ao cliente',
  },
  {
    value: 'create_event',
    label: 'Criar Evento',
    description: 'Agenda reuniões, demos e visitas vinculadas ao negócio',
  },
  {
    value: 'hand_off_to_human',
    label: 'Envolver Humano',
    description: 'Notifica o responsável. A IA decide se transfere (pausa) ou apenas notifica (continua atendendo).',
  },
] as const

export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
] as const

export const DAYS_AHEAD_OPTIONS = [
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3 dias' },
  { value: 4, label: '4 dias' },
  { value: 5, label: '5 dias' },
  { value: 6, label: '6 dias' },
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
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
  monday: { enabled: false, start: '09:00', end: '18:00' },
  tuesday: { enabled: false, start: '09:00', end: '18:00' },
  wednesday: { enabled: false, start: '09:00', end: '18:00' },
  thursday: { enabled: false, start: '09:00', end: '18:00' },
  friday: { enabled: false, start: '09:00', end: '18:00' },
  saturday: { enabled: false, start: '09:00', end: '13:00' },
  sunday: { enabled: false, start: '09:00', end: '13:00' },
}

export const ROLE_OPTIONS = [
  { value: 'sdr', label: 'SDR', description: 'Prospecta e qualifica leads' },
  { value: 'closer', label: 'Closer', description: 'Fecha negócios e negocia' },
  { value: 'support', label: 'Suporte', description: 'Atende dúvidas e resolve problemas' },
  { value: 'receptionist', label: 'Recepcionista', description: 'Recepciona e direciona contatos' },
  { value: 'custom', label: 'Personalizado', description: 'Defina um papel customizado' },
] as const

export const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'casual', label: 'Casual' },
] as const

export const RESPONSE_LENGTH_OPTIONS = [
  { value: 'short', label: 'Curta', description: '1-2 frases' },
  { value: 'medium', label: 'Média', description: '2-4 frases' },
  { value: 'detailed', label: 'Detalhada', description: '4+ frases' },
] as const

export const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'auto', label: 'Automático (idioma do cliente)' },
] as const

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  role: 'sdr',
  companyName: '',
  companyDescription: '',
  targetAudience: '',
  tone: 'professional',
  responseLength: 'medium',
  useEmojis: false,
  language: 'pt-BR',
  guidelines: [],
  restrictions: [],
}
