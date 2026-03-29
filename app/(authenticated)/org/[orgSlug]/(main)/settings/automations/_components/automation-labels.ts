import type { AutomationAction, AutomationTrigger } from '@prisma/client'

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  DEAL_CREATED: 'Negociação criada',
  DEAL_MOVED: 'Negociação movida de estágio',
  DEAL_STALE: 'Negociação sem atividade',
  DEAL_IDLE_IN_STAGE: 'Negociação parada em estágio',
  ACTIVITY_CREATED: 'Atividade registrada',
  DEAL_STATUS_CHANGED: 'Status da negociação alterado',
}

export const ACTION_LABELS: Record<AutomationAction, string> = {
  REASSIGN_DEAL: 'Reatribuir negociação',
  MOVE_DEAL_TO_STAGE: 'Mover para estágio',
  MARK_DEAL_LOST: 'Marcar como perdida',
  NOTIFY_USER: 'Enviar notificação',
  UPDATE_DEAL_PRIORITY: 'Alterar prioridade',
}

export const CONDITION_FIELD_LABELS: Record<string, string> = {
  stageId: 'Estágio',
  assignedTo: 'Responsável',
  priority: 'Prioridade',
  status: 'Status',
  value: 'Valor',
  pipelineId: 'Pipeline',
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
