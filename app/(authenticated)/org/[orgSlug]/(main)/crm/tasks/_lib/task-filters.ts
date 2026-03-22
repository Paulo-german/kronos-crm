import type { TaskType } from '@prisma/client'

export interface TaskFilters {
  types: TaskType[]
  status: 'all' | 'pending' | 'completed'
  dateFrom: Date | null
  dateTo: Date | null
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  types: [],
  status: 'all',
  dateFrom: null,
  dateTo: null,
}

export const TASK_TYPE_OPTIONS: Array<{
  value: TaskType
  label: string
  /** Nome do ícone Lucide — resolvido no componente de UI */
  icon: string
  /** Classes Tailwind para o chip visual */
  color: string
}> = [
  {
    value: 'TASK',
    label: 'Tarefa',
    icon: 'CheckCircle2',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  {
    value: 'MEETING',
    label: 'Reunião',
    icon: 'Users',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    value: 'CALL',
    label: 'Ligação',
    icon: 'Phone',
    color: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    value: 'WHATSAPP',
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    value: 'VISIT',
    label: 'Visita',
    icon: 'Briefcase',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  {
    value: 'EMAIL',
    label: 'E-mail',
    icon: 'Mail',
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  },
]

export const TASK_STATUS_OPTIONS: Array<{
  value: TaskFilters['status']
  label: string
}> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'completed', label: 'Concluídas' },
]
