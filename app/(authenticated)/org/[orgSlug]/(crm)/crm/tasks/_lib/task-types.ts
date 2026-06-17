import {
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TaskType } from '@prisma/client'

export interface TaskTypeMeta {
  value: TaskType
  /** Rótulo em PT-BR exibido na UI */
  label: string
  /** Componente Lucide — elimina os ICON_MAP/ICON strings locais */
  icon: LucideIcon
  /** Cor do ícone (timeline, selects). Ex: 'text-blue-500' */
  iconColor: string
  /** Classes do chip de filtro (bg + text + border). Ex: 'bg-blue-50 text-blue-600 border-blue-200' */
  chip: string
}

/**
 * Fonte única de metadados de TaskType.
 * Cada consumidor importa daqui e pega só o campo que precisa
 * (ícone como componente, label, cor do ícone ou classes do chip).
 */
export const TASK_TYPES: TaskTypeMeta[] = [
  {
    value: 'TASK',
    label: 'Tarefa',
    icon: CheckCircle2,
    iconColor: 'text-slate-500',
    chip: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  {
    value: 'MEETING',
    label: 'Reunião',
    icon: Users,
    iconColor: 'text-blue-500',
    chip: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    value: 'CALL',
    label: 'Ligação',
    icon: Phone,
    iconColor: 'text-green-500',
    chip: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    value: 'WHATSAPP',
    label: 'WhatsApp',
    icon: MessageCircle,
    iconColor: 'text-emerald-500',
    chip: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    value: 'VISIT',
    label: 'Visita',
    icon: Briefcase,
    iconColor: 'text-purple-500',
    chip: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  {
    value: 'EMAIL',
    label: 'E-mail',
    icon: Mail,
    iconColor: 'text-yellow-500',
    chip: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  },
]

export const TASK_TYPE_MAP: Record<TaskType, TaskTypeMeta> = Object.fromEntries(
  TASK_TYPES.map((taskType) => [taskType.value, taskType]),
) as Record<TaskType, TaskTypeMeta>
