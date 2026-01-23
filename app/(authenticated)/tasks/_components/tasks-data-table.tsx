'use client'

import { ColumnDef } from '@tanstack/react-table'
import {
  CalendarIcon,
  CheckCircle2,
  Circle,
  LinkIcon,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import TaskTableDropdownMenu from './table-dropdown-menu'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/_components/ui/button'
import { useAction } from 'next-safe-action/hooks'
import { toggleTaskStatus } from '@/_actions/task/toggle-task-status'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'

interface TasksDataTableProps {
  tasks: TaskDto[]
}

export function TasksDataTable({ tasks }: TasksDataTableProps) {
  const { execute: executeToggle } = useAction(toggleTaskStatus, {
    onError: () => toast.error('Erro ao atualizar status da tarefa.'),
  })

  // Optimistic UI local seria ideal aqui, mas vamos usar o fallback do hook por enquanto
  // O DataTable do shadcn não tem optimistic built-in fácil sem setup extra.

  const columns: ColumnDef<TaskDto>[] = [
    {
      accessorKey: 'isCompleted',
      header: 'Status',
      cell: ({ row }) => {
        const task = row.original
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-transparent"
            onClick={() => executeToggle({ id: task.id })}
          >
            {task.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'title',
      header: 'Tarefa',
      cell: ({ row }) => {
        const task = row.original
        return (
          <span
            className={cn(
              'font-medium transition-colors',
              task.isCompleted &&
                'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
          >
            {task.title}
          </span>
        )
      },
    },
    {
      accessorKey: 'deal.title',
      header: 'Oportunidade (Deal)',
      cell: ({ row }) => {
        const deal = row.original.deal
        const dealId = row.original.dealId
        if (!deal || !dealId)
          return <span className="text-xs text-muted-foreground">-</span>

        return (
          <Link
            href={`/pipeline/deal/${dealId}`}
            className="flex w-fit items-center gap-1.5 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary hover:underline"
          >
            <LinkIcon className="h-3 w-3" />
            {deal.title}
          </Link>
        )
      },
    },
    {
      accessorKey: 'dueDate',
      header: () => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>Vencimento</span>
        </div>
      ),
      cell: ({ row }) => {
        const date = row.getValue('dueDate') as Date | null
        if (!date)
          return <span className="text-xs text-muted-foreground">-</span>

        // Destaque se estiver atrasada e não completa
        const isOverdue =
          !row.original.isCompleted &&
          date < new Date() &&
          date.getDate() !== new Date().getDate()

        return (
          <span className={cn(isOverdue && 'font-medium text-red-500')}>
            {format(date, 'PPP', { locale: ptBR })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const task = row.original
        return <TaskTableDropdownMenu task={task} />
      },
    },
  ]

  return <DataTable columns={columns} data={tasks} />
}
