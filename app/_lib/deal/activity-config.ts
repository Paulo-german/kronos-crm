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
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  call: {
    icon: Phone,
    label: 'Ligação',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
  meeting: {
    icon: Users,
    label: 'Reunião',
    color: 'text-kronos-blue',
    bgColor: 'bg-kronos-blue/10',
  },
}
