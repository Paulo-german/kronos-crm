'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Pencil, Trash, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
import { AlertDialog } from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { toggleTask } from '@/_actions/deal/toggle-task'
import { updateTask } from '@/_actions/task/update-task'
import { deleteTask } from '@/_actions/task/delete-task'
import type {
  DealDetailsDto,
  DealTaskDto,
} from '@/_data-access/deal/get-deal-details'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import { UpsertTaskDialogContent } from '../../../../tasks/_components/upsert-dialog-content'

interface TabTasksProps {
  deal: DealDetailsDto
  dealOptions: DealOptionDto[]
}

const TabTasks = ({ deal, dealOptions }: TabTasksProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DealTaskDto | null>(null)
  const [deletingTask, setDeletingTask] = useState<DealTaskDto | null>(null)
  const [, startTransition] = useTransition()

  // Estado otimista para tarefas
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    deal.tasks,
    (currentTasks, taskId: string) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task,
      ),
  )

  const { execute: executeToggle } = useAction(toggleTask, {
    onSuccess: ({ data }) => {
      setIsDialogOpen(false)
      toast.success(
        data?.isCompleted ? 'Tarefa concluída!' : 'Tarefa reaberta!',
      )
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
        setDeletingTask(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir tarefa.')
      },
    },
  )

  const handleToggle = (taskId: string) => {
    startTransition(() => {
      setOptimisticTasks(taskId)
      executeToggle({ taskId })
    })
  }

  const mapToTaskDto = (task: DealTaskDto): TaskDto => ({
    id: task.id,
    title: task.title,
    type: task.type,
    dueDate: task.dueDate,
    isCompleted: task.isCompleted,
    dealId: task.dealId,
    deal: { title: deal.title },
    assignedTo: deal.assigneeId, // Usa o assignee do deal como fallback
    createdAt: new Date(),
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  const pendingTasks = optimisticTasks.filter((t) => !t.isCompleted)
  const completedTasks = optimisticTasks.filter((t) => t.isCompleted)

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) setEditingTask(null)
      }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tarefas</CardTitle>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
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
                  createdAt: new Date(),
                }
          }
          dealOptions={dealOptions}
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
                        onCheckedChange={() => handleToggle(task.id)}
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
                        onClick={() => setDeletingTask(task)}
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
                        onCheckedChange={() => handleToggle(task.id)}
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
                        onClick={() => setDeletingTask(task)}
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
        <AlertDialog
          open={!!deletingTask}
          onOpenChange={(open) => {
            if (!open) setDeletingTask(null)
          }}
        >
          <ConfirmationDialogContent
            variant="destructive"
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
          >
            <Button
              variant="destructive"
              onClick={() =>
                deletingTask && executeDelete({ id: deletingTask.id })
              }
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </ConfirmationDialogContent>
        </AlertDialog>
      </Card>
    </Dialog>
  )
}

export default TabTasks
