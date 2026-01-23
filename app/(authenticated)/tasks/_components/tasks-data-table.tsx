'use client'

import { ColumnDef } from '@tanstack/react-table'
import {
  CalendarIcon,
  CheckCircle2,
  Circle,
  LinkIcon,
  MoreHorizontal,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
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
  dealOptions: DealOptionDto[]
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  TASK: (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-slate-500" />
      <span>Tarefa</span>
    </div>
  ),
  MEETING: (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-blue-500" />
      <span>Reunião</span>
    </div>
  ),
  CALL: (
    <div className="flex items-center gap-2">
      <Phone className="h-4 w-4 text-green-500" />
      <span>Chamada</span>
    </div>
  ),
  WHATSAPP: (
    <div className="flex items-center gap-2">
      <MessageCircle className="h-4 w-4 text-emerald-500" />
      <span>Whatsapp</span>
    </div>
  ),
  VISIT: (
    <div className="flex items-center gap-2">
      <Briefcase className="h-4 w-4 text-purple-500" />
      <span>Visita</span>
    </div>
  ),
  EMAIL: (
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-yellow-500" />
      <span>Email</span>
    </div>
  ),
}

const TasksDataTable = ({ tasks, dealOptions }: TasksDataTableProps) => {
  const { execute: executeToggle } = useAction(toggleTaskStatus, {
    onSuccess: () => toast.success('Status da tarefa atualizado com sucesso.'),
    onError: () => toast.error('Erro ao atualizar status da tarefa.'),
  })

  const columns: ColumnDef<TaskDto>[] = [
    {
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.original.type as string
        return (
          <div title={type} className="flex w-fit items-center justify-center">
            {TASK_TYPE_ICONS[type] || TASK_TYPE_ICONS['TASK']}
          </div>
        )
      },
    },
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
            {format(date, 'PPP p', { locale: ptBR })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const task = row.original
        return <TaskTableDropdownMenu task={task} dealOptions={dealOptions} />
      },
    },
  ]

  return <DataTable columns={columns} data={tasks} />
}

export default TasksDataTable
