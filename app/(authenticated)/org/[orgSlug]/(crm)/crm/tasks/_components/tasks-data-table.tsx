'use client'

import {
  useState,
  useCallback,
  useMemo,
  useOptimistic,
  useTransition,
} from 'react'
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
  UserIcon,
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
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import { toggleTaskStatus } from '@/_actions/task/toggle-task-status'
import { deleteTask } from '@/_actions/task/delete-task'
import { updateTask } from '@/_actions/task/update-task'
import { bulkDeleteTasks } from '@/_actions/task/bulk-delete-tasks'
import { UpsertTaskDialogContent } from './upsert-dialog-content'
import TaskTableDropdownMenu from './table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { TaskOutcomeDialog } from './task-outcome-dialog'
import { TASK_OUTCOME_OPTIONS } from '@/_lib/task/outcome-config'
import { TASK_TYPE_MAP } from '../_lib/task-types'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import type { LucideIcon } from 'lucide-react'
import type { TaskType } from '@prisma/client'

// ---------------------------------------------------------------------------
// Tipos de seção da timeline
// ---------------------------------------------------------------------------

type TimelineSectionType =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'this-week'
  | 'upcoming'
  | 'completed'

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
    (taskA, taskB) =>
      new Date(taskA.dueDate).getTime() - new Date(taskB.dueDate).getTime(),
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
}

const TasksDataTable = ({ tasks }: TasksDataTableProps) => {
  const [, startTransition] = useTransition()

  // Estado do Sheet de edição (elevado para sobreviver ao re-render)
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingTask, setDeletingTask] = useState<TaskDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado do dialog de outcome (ao concluir uma tarefa)
  const [outcomeTask, setOutcomeTask] = useState<TaskDto | null>(null)

  // Estado de seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)

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

  // Hook de toggle de status (otimista) — usado apenas para reabrir tasks concluídas
  const { execute: executeToggle } = useAction(toggleTaskStatus, {
    onSuccess: () => toast.success('Status da tarefa atualizado com sucesso.'),
    onError: () => toast.error('Erro ao atualizar status da tarefa.'),
  })

  const handleToggle = useCallback(
    (task: TaskDto) => {
      // Reabrindo task concluída: toggle direto + otimismo
      if (task.isCompleted) {
        startTransition(() => {
          setOptimisticTasks(task.id)
          executeToggle({ id: task.id })
        })
        return
      }
      // Concluindo: abre dialog de outcome
      setOutcomeTask(task)
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

  // Hook para deletar tarefas em massa
  const { execute: executeBulkDelete, isPending: isBulkDeleting } = useAction(
    bulkDeleteTasks,
    {
      onSuccess: ({ data }) => {
        toast.success(
          `${data?.count ?? selectedIds.size} tarefa(s) excluída(s).`,
        )
        setIsBulkDeleteDialogOpen(false)
        setSelectedIds(new Set())
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir tarefas.')
      },
    },
  )

  const handleEdit = useCallback((task: TaskDto) => {
    setEditingTask(task)
    setIsEditSheetOpen(true)
  }, [])

  // Alterna a seleção de uma tarefa individual
  const handleSelectionChange = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
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

  // IDs das tarefas visíveis (seções não colapsadas) — base do "selecionar tudo"
  const visibleTaskIds = useMemo(
    () =>
      timelineSections
        .filter((section) => !collapsedGroups.has(section.key))
        .flatMap((section) => section.tasks.map((task) => task.id)),
    [timelineSections, collapsedGroups],
  )

  const allVisibleSelected =
    visibleTaskIds.length > 0 &&
    visibleTaskIds.every((id) => selectedIds.has(id))

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const everyVisibleSelected =
        visibleTaskIds.length > 0 && visibleTaskIds.every((id) => prev.has(id))
      if (everyVisibleSelected) return new Set()
      return new Set(visibleTaskIds)
    })
  }, [visibleTaskIds])

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

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Excluir tarefas selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-bold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'tarefa' : 'tarefas'}
            </span>
            .
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: Array.from(selectedIds) })}
        isLoading={isBulkDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de outcome ao concluir tarefa */}
      <TaskOutcomeDialog
        task={outcomeTask}
        open={!!outcomeTask}
        onOpenChange={(open) => {
          if (!open) setOutcomeTask(null)
        }}
        onCompleted={() => {
          if (outcomeTask) {
            startTransition(() => {
              setOptimisticTasks(outcomeTask.id)
            })
          }
          setOutcomeTask(null)
        }}
      />

      {/* Barra de ação em massa (aparece quando há seleção) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={handleToggleSelectAll}
            aria-label="Selecionar todas as tarefas visíveis"
          />
          <span className="text-sm font-medium">
            {selectedIds.size}{' '}
            {selectedIds.size === 1
              ? 'tarefa selecionada'
              : 'tarefas selecionadas'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              <TrashIcon className="h-4 w-4" />
              Excluir selecionadas
            </Button>
          </div>
        </div>
      )}

      {/* Timeline de seções */}
      <div className="flex flex-col gap-6">
        {timelineSections.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <CalendarIcon className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              Nenhuma tarefa encontrada para os filtros aplicados.
            </p>
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
                      isSelected={selectedIds.has(task.id)}
                      selectionActive={selectedIds.size > 0}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDeleteRequest={handleDeleteRequest}
                      onSelectionChange={handleSelectionChange}
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
// Sub-componente: TaskOutcomeBadge (resultado registrado ao concluir)
// ---------------------------------------------------------------------------

function TaskOutcomeBadge({ task }: { task: TaskDto }) {
  if (!task.isCompleted || !task.outcomeType) return null

  const options =
    TASK_OUTCOME_OPTIONS[task.type] ?? TASK_OUTCOME_OPTIONS['TASK']
  const outcomeOption = options.find(
    (option) => option.value === task.outcomeType,
  )
  if (!outcomeOption) return null

  const OutcomeIcon = outcomeOption.icon
  const badge = (
    <span
      className={cn(
        'hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium sm:flex',
        outcomeOption.positive
          ? 'border-kronos-green/40 bg-kronos-green/10 text-kronos-green'
          : 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      <OutcomeIcon className="h-3 w-3 shrink-0" />
      {outcomeOption.label}
    </span>
  )

  if (!task.outcomeNotes) return badge

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[240px] whitespace-pre-wrap text-xs"
        >
          {task.outcomeNotes}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Sub-componente: TimelineTaskRow
// ---------------------------------------------------------------------------

interface TimelineTaskRowProps {
  task: TaskDto
  isOverdueSection: boolean
  isDimmed: boolean
  isSelected: boolean
  selectionActive: boolean
  onToggle: (task: TaskDto) => void
  onEdit: (task: TaskDto) => void
  onDeleteRequest: (task: TaskDto) => void
  onSelectionChange: (taskId: string) => void
}

function TimelineTaskRow({
  task,
  isOverdueSection,
  isDimmed,
  isSelected,
  selectionActive,
  onToggle,
  onEdit,
  onDeleteRequest,
  onSelectionChange,
}: TimelineTaskRowProps) {
  const typeConfig = TASK_TYPE_MAP[task.type as TaskType] ?? TASK_TYPE_MAP.TASK
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
        'group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm',
        isDimmed &&
          'border-kronos-green/30 bg-kronos-green/10 opacity-70 hover:border-kronos-green/30 hover:bg-kronos-green/10 hover:text-kronos-green hover:opacity-100',
        isOverdueSection &&
          'hover:bg-destructive-15 border border-destructive/30 bg-destructive/10 hover:border-destructive/30 hover:text-destructive',
        isSelected && 'border-primary/50 bg-primary/5',
      )}
    >
      {/* Checkbox de seleção (visível em hover ou quando há seleção ativa) */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelectionChange(task.id)}
        aria-label={`Selecionar tarefa ${task.title}`}
        className={cn(
          'shrink-0 transition-opacity',
          !isSelected &&
            !selectionActive &&
            'opacity-0 group-hover:opacity-100',
        )}
      />

      {/* Botão de toggle (círculo/check otimista) */}
      <button
        type="button"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => onToggle(task)}
        aria-label={
          task.isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'
        }
      >
        {task.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-kronos-green" />
        ) : (
          <Circle
            className={cn('h-5 w-5', isOverdueSection && 'text-destructive')}
          />
        )}
      </button>

      {/* Ícone do tipo */}
      <TypeIcon className={cn('h-4 w-4 shrink-0', typeConfig.iconColor)} />

      {/* Título da tarefa */}
      <span
        className={cn(
          'flex-1 truncate text-sm font-medium',
          task.isCompleted && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </span>

      {/* Responsável (oculto em telas estreitas) */}
      {task.assignee?.fullName && (
        <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
          <UserIcon className="h-3 w-3 shrink-0" />
          <span className="max-w-[100px] truncate">
            {task.assignee.fullName.split(' ')[0]}
          </span>
        </span>
      )}

      {/* Outcome badge (só para tarefas concluídas com outcome registrado) */}
      <TaskOutcomeBadge task={task} />

      {/* Deal badge */}
      {task.deal && task.dealId && (
        <Link
          href={`/crm/deals/${task.dealId}`}
          className="flex shrink-0 items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary hover:underline"
        >
          <LinkIcon className="h-3 w-3" />
          <span className="max-w-[90px] truncate sm:max-w-[120px]">
            {task.deal.title}
          </span>
        </Link>
      )}

      {/* Data/horário */}
      <span
        className={cn(
          'shrink-0 text-xs tabular-nums text-muted-foreground',
          isOverdueSection &&
            !task.isCompleted &&
            'font-medium text-destructive',
        )}
      >
        {formattedDate}
      </span>

      {/* Menu de ações */}
      <div className="shrink-0">
        <TaskTableDropdownMenu
          task={task}
          onEdit={() => onEdit(task)}
          onDelete={() => onDeleteRequest(task)}
        />
      </div>
    </div>
  )
}
