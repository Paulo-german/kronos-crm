import { CheckSquare, Calendar, Phone, MessageCircle, MapPin, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TaskType } from '@prisma/client'
import type { TeamMemberTaskBreakdownItem } from '@/_data-access/reports/team/get-team-member-task-breakdown'

interface TeamMemberTaskBreakdownListProps {
  items: TeamMemberTaskBreakdownItem[]
}

interface TypeMeta {
  icon: LucideIcon
  label: string
}

const TYPE_META: Record<TaskType, TypeMeta> = {
  TASK: { icon: CheckSquare, label: 'Tarefa' },
  MEETING: { icon: Calendar, label: 'Reunião' },
  CALL: { icon: Phone, label: 'Ligação' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp' },
  VISIT: { icon: MapPin, label: 'Visita' },
  EMAIL: { icon: Mail, label: 'E-mail' },
}

export function TeamMemberTaskBreakdownList({ items }: TeamMemberTaskBreakdownListProps) {
  // A lista já vem inicializada com zeros do backend — não filtramos por count > 0.
  const total = items.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground">Nenhuma tarefa concluída neste período.</p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border/40 rounded-md border border-border/40">
      {items.map((item) => {
        const meta = TYPE_META[item.type]
        const Icon = meta.icon

        return (
          <li key={item.type} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <span>{meta.label}</span>
            </span>
            <span className="font-semibold tabular-nums">{item.count}</span>
          </li>
        )
      })}
    </ul>
  )
}
