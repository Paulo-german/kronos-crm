import {
  MessageSquare,
  Phone,
  Mail,
  Users,
  ArrowRight,
  Package,
  PackageMinus,
  PackageCheck,
  ListTodo,
  CheckCircle2,
  Trophy,
  XCircle,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Pause,
  Play,
  Calendar,
  UserPlus,
  UserMinus,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  CalendarX2,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  stage_change: ArrowRight,
  product_added: Package,
  product_removed: PackageMinus,
  product_updated: PackageCheck,
  task_created: ListTodo,
  task_completed: CheckCircle2,
  deal_won: Trophy,
  deal_lost: XCircle,
  deal_reopened: RotateCcw,
  assignee_changed: UserCheck,
  priority_changed: AlertTriangle,
  deal_paused: Pause,
  deal_unpaused: Play,
  date_changed: Calendar,
  contact_added: UserPlus,
  contact_removed: UserMinus,
  appointment_created: CalendarPlus,
  appointment_updated: CalendarClock,
  appointment_canceled: CalendarX,
  appointment_deleted: CalendarX2,
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: 'Nota adicionada',
  call: 'Ligação registrada',
  email: 'E-mail registrado',
  meeting: 'Reunião registrada',
  stage_change: 'Etapa alterada',
  product_added: 'Produto adicionado',
  product_removed: 'Produto removido',
  product_updated: 'Produto atualizado',
  task_created: 'Tarefa criada',
  task_completed: 'Tarefa concluída',
  deal_won: 'Deal ganho',
  deal_lost: 'Deal perdido',
  deal_reopened: 'Deal reaberto',
  assignee_changed: 'Responsável alterado',
  priority_changed: 'Prioridade alterada',
  deal_paused: 'Deal pausado',
  deal_unpaused: 'Deal retomado',
  date_changed: 'Data alterada',
  contact_added: 'Contato adicionado',
  contact_removed: 'Contato removido',
  appointment_created: 'Agendamento criado',
  appointment_updated: 'Agendamento atualizado',
  appointment_canceled: 'Agendamento cancelado',
  appointment_deleted: 'Agendamento excluído',
}

export function getActivityIcon(type: ActivityType): LucideIcon {
  return ACTIVITY_ICONS[type] ?? MessageSquare
}

export function getActivityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type] ?? type
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true })
}
