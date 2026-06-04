import {
  ArrowRightLeft,
  Package,
  PackageMinus,
  ListTodo,
  CheckCircle2,
  Trophy,
  XCircle,
  RotateCcw,
  PackageCheck,
  UserCog,
  Flag,
  PauseCircle,
  PlayCircle,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CalendarX2,
  UserPlus,
  UserMinus,
  FileText,
  MessageCircle,
  Briefcase,
} from 'lucide-react'
import {
  MANUAL_ACTIVITY_CONFIG,
  type ActivityTypeConfig,
} from '@/_lib/deal/activity-config'

export const ACTIVITY_CONFIG: Record<string, ActivityTypeConfig> = {
  ...MANUAL_ACTIVITY_CONFIG,
  stage_change: {
    icon: ArrowRightLeft,
    label: 'Mudança de Etapa',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  product_added: {
    icon: Package,
    label: 'Produto Adicionado',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  product_removed: {
    icon: PackageMinus,
    label: 'Produto Removido',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  task_created: {
    icon: ListTodo,
    label: 'Tarefa Criada',
    color: 'text-kronos-yellow',
    bgColor: 'bg-kronos-yellow/10',
  },
  task_completed: {
    icon: CheckCircle2,
    label: 'Tarefa Concluída',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  deal_won: {
    icon: Trophy,
    label: 'Negócio Ganho',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  deal_lost: {
    icon: XCircle,
    label: 'Negócio Perdido',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  deal_reopened: {
    icon: RotateCcw,
    label: 'Negócio Reaberto',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  product_updated: {
    icon: PackageCheck,
    label: 'Produto Atualizado',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  assignee_changed: {
    icon: UserCog,
    label: 'Responsável Alterado',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  priority_changed: {
    icon: Flag,
    label: 'Prioridade Alterada',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  deal_paused: {
    icon: PauseCircle,
    label: 'Negócio Pausado',
    color: 'text-kronos-yellow',
    bgColor: 'bg-kronos-yellow/10',
  },
  deal_unpaused: {
    icon: PlayCircle,
    label: 'Negócio Retomado',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  date_changed: {
    icon: CalendarClock,
    label: 'Previsão Alterada',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  contact_added: {
    icon: UserPlus,
    label: 'Contato Adicionado',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  contact_removed: {
    icon: UserMinus,
    label: 'Contato Removido',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  appointment_created: {
    icon: CalendarPlus,
    label: 'Agendamento Criado',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  appointment_updated: {
    icon: CalendarClock,
    label: 'Agendamento Atualizado',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  appointment_canceled: {
    icon: CalendarX,
    label: 'Agendamento Cancelado',
    color: 'text-destructive',
    bgColor: 'bg-red-500/10',
  },
  appointment_deleted: {
    icon: CalendarX2,
    label: 'Agendamento Excluído',
    color: 'text-destructive',
    bgColor: 'bg-red-500/10',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-kronos-green',
    bgColor: 'bg-kronos-green/10',
  },
  visit: {
    icon: Briefcase,
    label: 'Visita',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
}

export const FALLBACK_CONFIG: ActivityTypeConfig = {
  icon: FileText,
  label: 'Atividade',
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
}

export function getActivityConfig(type: string): ActivityTypeConfig {
  return ACTIVITY_CONFIG[type] ?? FALLBACK_CONFIG
}

export function formatActivityDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
