import { FileText, Phone, Mail, Users, type LucideIcon } from 'lucide-react'

export type ManualActivityType = 'note' | 'call' | 'email' | 'meeting'

export interface ActivityTypeConfig {
  icon: LucideIcon
  label: string
  color: string
  bgColor: string
}

export const MANUAL_ACTIVITY_CONFIG: Record<ManualActivityType, ActivityTypeConfig> = {
  note: {
    icon: FileText,
    label: 'Nota',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  call: {
    icon: Phone,
    label: 'Ligação',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  meeting: {
    icon: Users,
    label: 'Reunião',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
}
