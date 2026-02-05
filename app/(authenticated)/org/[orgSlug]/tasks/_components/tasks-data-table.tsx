'use client'

import { useOptimistic, useTransition } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  CalendarIcon,
  CheckCircle2,
  Circle,
  LinkIcon,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
  TrashIcon,
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
import { bulkDeleteTasks } from '@/_actions/task/bulk-delete-tasks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'

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
  const [, startTransition] = useTransition()

  // Estado otimista para tarefas
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (currentTasks, taskId: string) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task,
      ),
  )

  const { execute: executeToggle } = useAction(toggleTaskStatus, {
    onSuccess: () => toast.success('Status da tarefa atualizado com sucesso.'),
    onError: () => toast.error('Erro ao atualizar status da tarefa.'),
  })

  const handleToggle = (taskId: string) => {
    startTransition(() => {
      setOptimisticTasks(taskId)
      executeToggle({ id: taskId })
    })
  }

  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteTasks,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || 'Tarefas'} excluídas com sucesso.`)
      },
      onError: () => {
        toast.error('Erro ao excluir tarefas.')
      },
    },
  )

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
            onClick={() => handleToggle(task.id)}
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

  return (
    <DataTable
      columns={columns}
      data={optimisticTasks}
      enableSelection={true}
      bulkActions={({ selectedRows, resetSelection }) => (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8">
                <TrashIcon className="mr-2 h-4 w-4" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <ConfirmationDialogContent
              title="Excluir tarefas selecionadas?"
              description={
                <p>
                  Esta ação não pode ser desfeita. Você está prestes a remover
                  <br />
                  <span className="font-semibold text-foreground">
                    {selectedRows.length} tarefas permanentemente do sistema.
                  </span>
                </p>
              }
              icon={<TrashIcon />}
              variant="destructive"
            >
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={() => {
                  const ids = selectedRows.map((r) => r.id)
                  executeBulkDelete({ ids })
                  resetSelection()
                }}
              >
                Sim, excluir
              </AlertDialogAction>
            </ConfirmationDialogContent>
          </AlertDialog>
        </>
      )}
    />
  )
}

export default TasksDataTable
