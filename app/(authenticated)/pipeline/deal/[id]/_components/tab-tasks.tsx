'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { createTask } from '@/_actions/deal/create-task'
import { toggleTask } from '@/_actions/deal/toggle-task'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface TabTasksProps {
  deal: DealDetailsDto
}

const TabTasks = ({ deal }: TabTasksProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createTask,
    {
      onSuccess: () => {
        toast.success('Tarefa criada!')
        setIsDialogOpen(false)
        setTitle('')
        setDueDate('')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar tarefa.')
      },
    },
  )

  const { execute: executeToggle } = useAction(toggleTask, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.isCompleted ? 'Tarefa concluída!' : 'Tarefa reaberta!',
      )
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar tarefa.')
    },
  })

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Digite o título da tarefa.')
      return
    }
    executeCreate({
      dealId: deal.id,
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  const pendingTasks = deal.tasks.filter((t) => !t.isCompleted)
  const completedTasks = deal.tasks.filter((t) => t.isCompleted)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tarefas</CardTitle>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </CardHeader>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Crie uma tarefa para acompanhar este deal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Enviar proposta comercial"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data e Hora de Vencimento</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent className="space-y-4">
        {deal.tasks.length === 0 ? (
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
                      onCheckedChange={() => executeToggle({ taskId: task.id })}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Vence: {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
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
                      onCheckedChange={() => executeToggle({ taskId: task.id })}
                    />
                    <div className="flex-1">
                      <p className="font-medium line-through">{task.title}</p>
                      <span className="text-xs text-muted-foreground">
                        Concluída
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TabTasks
