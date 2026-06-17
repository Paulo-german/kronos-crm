'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Pencil, Trash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { toggleTask } from '@/_actions/deal/toggle-task'
import { updateTask } from '@/_actions/task/update-task'
import { deleteTask } from '@/_actions/task/delete-task'
import type {
  DealDetailsDto,
  DealTaskDto,
} from '@/_data-access/deal/get-deal-details'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import { UpsertTaskDialogContent } from '../../../tasks/_components/upsert-dialog-content'
import { TaskOutcomeDialog } from '../../../tasks/_components/task-outcome-dialog'

interface TabTasksProps {
  deal: DealDetailsDto
  tasks: DealTaskDto[]
}

const TabTasks = ({ deal, tasks }: TabTasksProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DealTaskDto | null>(null)
  const [deletingTask, setDeletingTask] = useState<DealTaskDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [outcomeTask, setOutcomeTask] = useState<DealTaskDto | null>(null)
  const [, startTransition] = useTransition()

  // Estado otimista para tarefas
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (currentTasks, taskId: string) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task,
      ),
  )

  const { execute: executeToggle } = useAction(toggleTask, {
    onSuccess: () => {
      toast.success('Tarefa reaberta!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar tarefa.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateTask,
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingTask(null)
        toast.success('Tarefa atualizada com sucesso!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar tarefa.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteTask,
    {
      onSuccess: () => {
        toast.success('Tarefa excluída com sucesso!')
        setIsDeleteDialogOpen(false)
        setDeletingTask(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir tarefa.')
      },
    },
  )

  const handleToggle = (task: DealTaskDto) => {
    // Reabrindo task concluída: toggle direto + otimismo
    if (task.isCompleted) {
      startTransition(() => {
        setOptimisticTasks(task.id)
        executeToggle({ taskId: task.id })
      })
      return
    }
    // Concluindo: abre dialog de outcome
    setOutcomeTask(task)
  }

  const mapToTaskDto = (task: DealTaskDto): TaskDto => ({
    id: task.id,
    title: task.title,
    type: task.type,
    dueDate: task.dueDate,
    isCompleted: task.isCompleted,
    dealId: task.dealId,
    deal: { title: deal.title },
    assignedTo: deal.assigneeId,
    assignee: { fullName: deal.assigneeName },
    createdAt: new Date(),
    outcomeType: task.outcomeType,
    outcomeNotes: task.outcomeNotes,
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  const pendingTasks = optimisticTasks.filter((task) => !task.isCompleted)
  const completedTasks = optimisticTasks.filter((task) => task.isCompleted)

  return (
    <Sheet
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) setEditingTask(null)
      }}
    >
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tarefas</CardTitle>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </SheetTrigger>
        </CardHeader>

        <UpsertTaskDialogContent
          key={editingTask?.id ?? 'new'}
          defaultValues={
            editingTask
              ? mapToTaskDto(editingTask)
              : {
                  id: '',
                  dealId: deal.id,
                  type: 'TASK',
                  title: '',
                  isCompleted: false,
                  dueDate: new Date(),
                  deal: { title: deal.title },
                  assignedTo: deal.assigneeId,
                  assignee: { fullName: deal.assigneeName },
                  createdAt: new Date(),
                  outcomeType: null,
                  outcomeNotes: null,
                }
          }
          setIsOpen={(open) => {
            setIsDialogOpen(open)
            if (!open) setEditingTask(null)
          }}
          fixedDealId={deal.id}
          onUpdate={(data) => executeUpdate(data)}
          isUpdating={isUpdating}
        />

        <CardContent className="space-y-4">
          {optimisticTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma tarefa criada ainda.
            </div>
          ) : (
            <>
              {/* Tarefas Pendentes */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Pendentes ({pendingTasks.length})
                  </h4>
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleToggle(task)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Vence: {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTask(task)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingTask(task)
                          setIsDeleteDialogOpen(true)
                        }}
                        title="Excluir tarefa"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tarefas Concluídas */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Concluídas ({completedTasks.length})
                  </h4>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-md border bg-muted/50 p-3 opacity-70"
                    >
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => handleToggle(task)}
                      />
                      <div className="flex-1">
                        <p className="font-medium line-through">{task.title}</p>
                        <span className="text-xs text-muted-foreground">
                          Concluída
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTask(task)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingTask(task)
                          setIsDeleteDialogOpen(true)
                        }}
                        title="Excluir tarefa"
                      >
                        <Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
        {/* Dialog de Exclusão Controlado */}
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) setDeletingTask(null)
          }}
          title="Excluir tarefa?"
          description={
            <p>
              Esta ação não pode ser desfeita. Você está prestes a remover
              permanentemente a tarefa{' '}
              <strong className="font-semibold text-foreground">
                {deletingTask?.title}
              </strong>
            </p>
          }
          icon={<Trash />}
          variant="destructive"
          onConfirm={() => {
            if (deletingTask) executeDelete({ id: deletingTask.id })
          }}
          isLoading={isDeleting}
          confirmLabel="Confirmar Exclusão"
        />

        <TaskOutcomeDialog
          task={
            outcomeTask
              ? {
                  id: outcomeTask.id,
                  title: outcomeTask.title,
                  type: outcomeTask.type,
                }
              : null
          }
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
      </Card>
    </Sheet>
  )
}

export default TabTasks
