import { AutomationTrigger } from '@prisma/client'
import type { AutomationAction } from '@prisma/client'

// Fonte canônica dos triggers de contato — importada por todos os steps do wizard
export const CONTACT_TRIGGER_SET = new Set<AutomationTrigger>([
  AutomationTrigger.CONTACT_CREATED,
])

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  DEAL_CREATED: 'Negociação criada',
  DEAL_MOVED: 'Negociação movida de estágio',
  DEAL_STALE: 'Negociação sem atividade',
  DEAL_IDLE_IN_STAGE: 'Negociação parada em estágio',
  ACTIVITY_CREATED: 'Atividade registrada',
  DEAL_STATUS_CHANGED: 'Status da negociação alterado',
  CONTACT_CREATED: 'Contato criado',
}

export const ACTION_LABELS: Record<AutomationAction, string> = {
  REASSIGN_DEAL: 'Reatribuir negociação',
  MOVE_DEAL_TO_STAGE: 'Mover para estágio',
  MARK_DEAL_LOST: 'Marcar como perdida',
  NOTIFY_USER: 'Enviar notificação',
  UPDATE_DEAL_PRIORITY: 'Alterar prioridade',
  SEND_WHATSAPP_FOLLOWUP: 'Enviar follow-up no WhatsApp',
  UPDATE_CONTACT_LIFECYCLE: 'Avançar ciclo do contato',
  CREATE_TASK: 'Criar tarefa',
}

export const CONDITION_FIELD_LABELS: Record<string, string> = {
  stageId: 'Estágio',
  assignedTo: 'Responsável',
  priority: 'Prioridade',
  status: 'Status',
  value: 'Valor',
  pipelineId: 'Pipeline',
  lifecycleStage: 'Etapa do ciclo',
  source: 'Origem',
}

export const CONDITION_OPERATOR_LABELS: Record<string, string> = {
  equals: 'é igual a',
  not_equals: 'não é igual a',
  gt: 'maior que',
  lt: 'menor que',
  gte: 'maior ou igual a',
  lte: 'menor ou igual a',
  in: 'está em',
  not_in: 'não está em',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Baixa', value: 'low' },
  { label: 'Média', value: 'medium' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' },
]

export const DEAL_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  WON: 'Ganha',
  LOST: 'Perdida',
  PAUSED: 'Pausada',
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: 'Nota',
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
}

export const REASSIGN_STRATEGY_LABELS: Record<string, string> = {
  round_robin: 'Rotação (Round-robin)',
  specific_user: 'Membro específico',
  least_deals: 'Menor número de negociações',
}

export const NOTIFY_TARGET_LABELS: Record<string, string> = {
  deal_assignee: 'Responsável pela negociação',
  specific_users: 'Usuários específicos',
  org_admins: 'Gestores da organização',
}

export const LIFECYCLE_STAGE_OPTIONS: {
  label: string
  value: string
  description: string
}[] = [
  {
    label: 'Frio',
    value: 'COLD',
    description: 'Lista importada que ainda não levantou a mão',
  },
  {
    label: 'Lead',
    value: 'LEAD',
    description: 'Entrou no funil, sem qualificação ainda',
  },
  {
    label: 'Qualificado',
    value: 'QUALIFIED',
    description: 'Demonstrou interesse e fit',
  },
  {
    label: 'Oportunidade',
    value: 'OPPORTUNITY',
    description: 'Em negociação ativa',
  },
  { label: 'Cliente', value: 'CUSTOMER', description: 'Conversão realizada' },
]

// Inclui COLD e LEAD (para uso em conditions de CONTACT_CREATED / listas frias)
export const LIFECYCLE_STAGE_CONDITION_OPTIONS: {
  label: string
  value: string
}[] = [
  { label: 'Frio', value: 'COLD' },
  { label: 'Lead', value: 'LEAD' },
  { label: 'Qualificado', value: 'QUALIFIED' },
  { label: 'Oportunidade', value: 'OPPORTUNITY' },
  { label: 'Cliente', value: 'CUSTOMER' },
]

export const CAPTURE_CHANNEL_OPTIONS: { label: string; value: string }[] = [
  { label: 'Site / Chat', value: 'WEBSITE_CHAT' },
  { label: 'Formulário embutido', value: 'EMBED_FORM' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'Facebook Lead', value: 'FACEBOOK_LEAD' },
  { label: 'API / Webhook', value: 'API' },
  { label: 'Ligação', value: 'PHONE_CALL' },
  { label: 'Presencial', value: 'IN_PERSON' },
  { label: 'Evento', value: 'EVENT' },
  { label: 'E-mail', value: 'EMAIL' },
  { label: 'Indicação', value: 'REFERRAL' },
  { label: 'Importação', value: 'IMPORT' },
  { label: 'Não identificado', value: 'UNKNOWN' },
]

export const TASK_ACTION_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tarefa', value: 'TASK' },
  { label: 'Reunião', value: 'MEETING' },
  { label: 'Ligação', value: 'CALL' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Visita', value: 'VISIT' },
  { label: 'E-mail', value: 'EMAIL' },
]

export const TASK_ASSIGN_OPTIONS: { label: string; value: string }[] = [
  { label: 'Responsável pela negociação', value: 'deal_assignee' },
  { label: 'Membro específico', value: 'specific_user' },
]

export const DEAL_ASSIGN_OPTIONS: { label: string; value: string }[] = [
  { label: 'Responsável pelo contato', value: 'contact_assignee' },
  { label: 'Membro específico', value: 'specific_user' },
]
