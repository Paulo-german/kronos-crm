import { Badge } from '@/_components/ui/badge'
import type { PendingTask } from '@/_data-access/dashboard'
import { cn } from '@/_lib/utils'
import { format, isToday, isPast, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TASK_TYPE_MAP } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/tasks/_lib/task-types'

interface TaskListItemProps {
  task: PendingTask
}

function getDueDateStyle(date: Date) {
  if (isPast(date) && !isToday(date)) return 'destructive' as const
  if (isToday(date) || isTomorrow(date)) return 'outline' as const
  return 'secondary' as const
}

export function TaskListItem({ task }: TaskListItemProps) {
  const Icon = TASK_TYPE_MAP[task.type]?.icon ?? TASK_TYPE_MAP.TASK.icon
  const variant = getDueDateStyle(task.dueDate)

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {task.dealTitle}
        </p>
      </div>
      <Badge
        variant={variant}
        className={cn(
          'shrink-0 text-[10px]',
          variant === 'destructive' && 'animate-pulse',
        )}
      >
        {format(task.dueDate, 'dd MMM', { locale: ptBR })}
      </Badge>
    </div>
  )
}
