import type { LucideIcon } from 'lucide-react'
import {
  PhoneCall,
  PhoneOff,
  Voicemail,
  UserX,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  MessageCircle,
  MessageCircleOff,
  Briefcase,
  Ban,
  Mail,
  MailQuestion,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react'

export interface TaskOutcomeOption {
  value: string
  label: string
  icon: LucideIcon
  positive: boolean
}

export const TASK_OUTCOME_OPTIONS: Record<string, TaskOutcomeOption[]> = {
  CALL: [
    { value: 'answered', label: 'Atendeu', icon: PhoneCall, positive: true },
    { value: 'no_answer', label: 'Não atendeu', icon: PhoneOff, positive: false },
    { value: 'voicemail', label: 'Caixa postal', icon: Voicemail, positive: false },
    { value: 'wrong_number', label: 'Número errado', icon: UserX, positive: false },
  ],
  MEETING: [
    { value: 'meeting_held', label: 'Reunião realizada', icon: CalendarCheck, positive: true },
    { value: 'rescheduled', label: 'Cliente remarcou', icon: CalendarClock, positive: false },
    { value: 'no_show', label: 'Cliente não compareceu', icon: CalendarX, positive: false },
  ],
  WHATSAPP: [
    { value: 'replied', label: 'Respondeu', icon: MessageCircle, positive: true },
    { value: 'no_reply', label: 'Não respondeu', icon: MessageCircleOff, positive: false },
  ],
  VISIT: [
    { value: 'visit_done', label: 'Visita realizada', icon: Briefcase, positive: true },
    { value: 'visit_canceled', label: 'Visita cancelada', icon: Ban, positive: false },
    { value: 'rescheduled', label: 'Cliente remarcou', icon: CalendarClock, positive: false },
  ],
  EMAIL: [
    { value: 'replied', label: 'Respondeu', icon: Mail, positive: true },
    { value: 'no_reply', label: 'Sem resposta', icon: MailQuestion, positive: false },
  ],
  TASK: [
    { value: 'done', label: 'Concluída', icon: CheckCircle2, positive: true },
    { value: 'partial', label: 'Parcialmente concluída', icon: CircleDashed, positive: false },
  ],
}

export function getOutcomeLabel(taskType: string, outcomeValue: string): string {
  const options = TASK_OUTCOME_OPTIONS[taskType] ?? []
  return options.find((opt) => opt.value === outcomeValue)?.label ?? outcomeValue
}

export function mapTaskTypeToActivityType(taskType: string): string {
  const map: Record<string, string> = {
    CALL: 'call',
    MEETING: 'meeting',
    EMAIL: 'email',
    WHATSAPP: 'whatsapp',
    VISIT: 'visit',
    TASK: 'task_completed',
  }
  return map[taskType] ?? 'task_completed'
}
