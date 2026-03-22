'use client'

import { useState, useCallback, useMemo, useOptimistic, useTransition } from 'react'
import {
  AlertTriangleIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CalendarClockIcon,
  CheckCircle2,
  ChevronDown,
  Circle,
  LinkIcon,
  TrashIcon,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import {
  isToday,
  isTomorrow,
  isThisWeek,
  isBefore,
  startOfToday,
  startOfDay,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Sheet } from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import { toggleTaskStatus } from '@/_actions/task/toggle-task-status'
import { deleteTask } from '@/_actions/task/delete-task'
import { updateTask } from '@/_actions/task/update-task'
import { UpsertTaskDialogContent } from './upsert-dialog-content'
import TaskTableDropdownMenu from './table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Mapa de ícones por tipo de tarefa
// ---------------------------------------------------------------------------

const TASK_TYPE_ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  TASK: { icon: CheckCircle2, color: 'text-slate-500' },
  MEETING: { icon: Users, color: 'text-blue-500' },
  CALL: { icon: Phone, color: 'text-green-500' },
  WHATSAPP: { icon: MessageCircle, color: 'text-emerald-500' },
  VISIT: { icon: Briefcase, color: 'text-purple-500' },
  EMAIL: { icon: Mail, color: 'text-yellow-500' },
}

// ---------------------------------------------------------------------------
// Tipos de seção da timeline
// ---------------------------------------------------------------------------

type TimelineSectionType = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'upcoming' | 'completed'

interface TaskTimelineSection {
  label: string
  key: string
  tasks: TaskDto[]
  type: TimelineSectionType
}

// ---------------------------------------------------------------------------
// Helpers de agrupamento
// ---------------------------------------------------------------------------

function sortByDueDate(tasks: TaskDto[]): TaskDto[] {
  return [...tasks].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )
}

function groupTasksByDeadline(tasks: TaskDto[]): TaskTimelineSection[] {
  const todayStart = startOfToday()

  const overdue: TaskDto[] = []
  const todayTasks: TaskDto[] = []
  const tomorrowTasks: TaskDto[] = []
  const thisWeekTasks: TaskDto[] = []
  const upcomingTasks: TaskDto[] = []
  const completedTasks: TaskDto[] = []

  for (const task of tasks) {
    if (task.isCompleted) {
      completedTasks.push(task)
      continue
    }

    const dueDate = new Date(task.dueDate)

    if (isBefore(startOfDay(dueDate), todayStart)) {
      overdue.push(task)
      continue
    }

    if (isToday(dueDate)) {
      todayTasks.push(task)
      continue
    }

    if (isTomorrow(dueDate)) {
      tomorrowTasks.push(task)
      continue
    }

    if (isThisWeek(dueDate, { weekStartsOn: 1 })) {
      thisWeekTasks.push(task)
      continue
    }

    upcomingTasks.push(task)
  }

  const sections: TaskTimelineSection[] = []

  if (overdue.length > 0) {
    sections.push({
      label: 'Atrasadas',
      key: 'overdue',
      tasks: sortByDueDate(overdue),
      type: 'overdue',
    })
  }

  if (todayTasks.length > 0) {
    sections.push({
      label: 'Hoje',
      key: 'today',
      tasks: sortByDueDate(todayTasks),
      type: 'today',
    })
  }

  if (tomorrowTasks.length > 0) {
    sections.push({
      label: 'Amanhã',
      key: 'tomorrow',
      tasks: sortByDueDate(tomorrowTasks),
      type: 'tomorrow',
    })
  }

  if (thisWeekTasks.length > 0) {
    sections.push({
      label: 'Esta Semana',
      key: 'this-week',
      tasks: sortByDueDate(thisWeekTasks),
      type: 'this-week',
    })
  }

  if (upcomingTasks.length > 0) {
    sections.push({
      label: 'Próximas',
      key: 'upcoming',
      tasks: sortByDueDate(upcomingTasks),
      type: 'upcoming',
    })
  }

  if (completedTasks.length > 0) {
    sections.push({
      label: 'Concluídas',
      key: 'completed',
      tasks: sortByDueDate(completedTasks),
      type: 'completed',
    })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Props principais
// ---------------------------------------------------------------------------

interface TasksDataTableProps {
  tasks: TaskDto[]
  dealOptions: DealOptionDto[]
}

const TasksDataTable = ({ tasks, dealOptions }: TasksDataTableProps) => {
  const [, startTransition] = useTransition()

  // Estado do Sheet de edição (elevado para sobreviver ao re-render)
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Seção "Concluídas" começa colapsada por padrão
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(['completed']),
  )

  // Estado otimista para toggle de status
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (currentTasks, taskId: string) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task,
      ),
  )

  // Hook de toggle de status (otimista)
  const { execute: executeToggle } = useAction(toggleTaskStatus, {
    onSuccess: () => toast.success('Status da tarefa atualizado com sucesso.'),
    onError: () => toast.error('Erro ao atualizar status da tarefa.'),
  })

  const handleToggle = useCallback(
    (taskId: string) => {
      startTransition(() => {
        setOptimisticTasks(taskId)
        executeToggle({ id: taskId })
      })
    },
    [executeToggle, setOptimisticTasks],
  )

  // Hook para atualizar tarefa via Sheet de edição
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateTask,
    {
      onSuccess: () => {
        toast.success('Tarefa atualizada com sucesso.')
        setIsEditSheetOpen(false)
        setEditingTask(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar tarefa.')
      },
    },
  )

  // Hook para deletar tarefa individualmente
  const { execute: executeDelete, isExecuting: isDeletingIndividual } =
    useAction(deleteTask, {
      onSuccess: () => {
        toast.success('Tarefa excluída com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingTask(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir tarefa.')
      },
    })

  const handleEdit = useCallback((task: TaskDto) => {
    setEditingTask(task)
    setIsEditSheetOpen(true)
  }, [])

  const handleDeleteRequest = useCallback((task: TaskDto) => {
    setDeletingTask(task)
    setIsDeleteDialogOpen(true)
  }, [])

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  // Agrupamento memoizado usando as tasks otimistas (reflete toggle imediato)
  const timelineSections = useMemo(
    () => groupTasksByDeadline(optimisticTasks),
    [optimisticTasks],
  )

  return (
    <>
      {/* Sheet de edição fora da lista para sobreviver ao re-render */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingTask(null)
        }}
      >
        {editingTask && (
          <UpsertTaskDialogContent
            key={editingTask.id}
            defaultValues={editingTask}
            dealOptions={dealOptions}
            setIsOpen={setIsEditSheetOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de deleção individual fora da lista */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingTask(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente a tarefa{' '}
            <span className="font-bold text-foreground">
              {deletingTask?.title}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingTask) executeDelete({ id: deletingTask.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Timeline de seções */}
      <div className="flex flex-col gap-6">
        {timelineSections.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <CalendarIcon className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma tarefa encontrada para os filtros aplicados.</p>
          </div>
        )}

        {timelineSections.map((section) => {
          const isCollapsible = section.type === 'completed'
          const isCollapsed = collapsedGroups.has(section.key)
          const isOverdueSection = section.type === 'overdue'
          const isDimmedGroup = section.type === 'completed'

          // Ícone do header da seção
          const SectionIcon = getSectionIcon(section.type)

          return (
            <div key={section.key} className="flex flex-col gap-3">
              {/* Header da seção */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider',
                    isOverdueSection
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  <SectionIcon className="h-3.5 w-3.5" />
                  {section.label}
                  <span className="font-normal normal-case">
                    ({section.tasks.length})
                  </span>
                </span>
                <div className="h-px flex-1 bg-border" />
                {isCollapsible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => toggleGroupCollapse(section.key)}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform duration-200',
                        isCollapsed ? '' : 'rotate-180',
                      )}
                    />
                    {isCollapsed ? 'Expandir' : 'Recolher'}
                  </Button>
                )}
              </div>

              {/* Rows da seção */}
              {!isCollapsed && (
                <div className="flex flex-col gap-1">
                  {section.tasks.map((task) => (
                    <TimelineTaskRow
                      key={task.id}
                      task={task}
                      isOverdueSection={isOverdueSection}
                      isDimmed={isDimmedGroup}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default TasksDataTable

// ---------------------------------------------------------------------------
// Helper: resolve ícone da seção por tipo
// ---------------------------------------------------------------------------

function getSectionIcon(type: TimelineSectionType): LucideIcon {
  switch (type) {
    case 'overdue':
      return AlertTriangleIcon
    case 'today':
    case 'tomorrow':
      return CalendarIcon
    case 'this-week':
      return CalendarDaysIcon
    case 'upcoming':
      return CalendarClockIcon
    case 'completed':
      return CheckCircle2
  }
}

// ---------------------------------------------------------------------------
// Sub-componente: TimelineTaskRow
// ---------------------------------------------------------------------------

interface TimelineTaskRowProps {
  task: TaskDto
  isOverdueSection: boolean
  isDimmed: boolean
  onToggle: (taskId: string) => void
  onEdit: (task: TaskDto) => void
  onDeleteRequest: (task: TaskDto) => void
}

function TimelineTaskRow({
  task,
  isOverdueSection,
  isDimmed,
  onToggle,
  onEdit,
  onDeleteRequest,
}: TimelineTaskRowProps) {
  const typeConfig = TASK_TYPE_ICON_MAP[task.type] ?? TASK_TYPE_ICON_MAP['TASK']
  const TypeIcon = typeConfig.icon
  const dueDate = new Date(task.dueDate)

  // Formatação de data contextual: hoje/amanhã → só horário; outros → dd/MM
  const formattedDate =
    isToday(dueDate) || isTomorrow(dueDate)
      ? format(dueDate, 'HH:mm', { locale: ptBR })
      : format(dueDate, 'dd/MM', { locale: ptBR })

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-all hover:border-primary/20 hover:shadow-sm',
        isDimmed && 'opacity-60',
        isOverdueSection && 'border-l-2 border-l-destructive/30',
      )}
    >
      {/* Botão de toggle (círculo/check otimista) */}
      <button
        type="button"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => onToggle(task.id)}
        aria-label={task.isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
      >
        {task.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Ícone do tipo */}
      <TypeIcon className={cn('h-4 w-4 shrink-0', typeConfig.color)} />

      {/* Título da tarefa */}
      <span
        className={cn(
          'flex-1 truncate text-sm font-medium',
          task.isCompleted && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </span>

      {/* Deal badge */}
      {task.deal && task.dealId && (
        <Link
          href={`/crm/deals/${task.dealId}`}
          className="flex shrink-0 items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <LinkIcon className="h-3 w-3" />
          <span className="max-w-[120px] truncate">{task.deal.title}</span>
        </Link>
      )}

      {/* Data/horário */}
      <span
        className={cn(
          'shrink-0 text-xs tabular-nums text-muted-foreground',
          isOverdueSection && !task.isCompleted && 'font-medium text-destructive',
        )}
      >
        {formattedDate}
      </span>

      {/* Menu de ações */}
      <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
        <TaskTableDropdownMenu
          task={task}
          onEdit={() => onEdit(task)}
          onDelete={() => onDeleteRequest(task)}
        />
      </div>
    </div>
  )
}
