'use client'

import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { deleteTask } from '@/_actions/task/delete-task'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteTaskDialogContentProps {
  taskId: string
  taskTitle: string
  onSuccess?: () => void
}

export function DeleteTaskDialogContent({
  taskId,
  taskTitle,
  onSuccess,
}: DeleteTaskDialogContentProps) {
  const { execute, isExecuting } = useAction(deleteTask, {
    onSuccess: () => {
      toast.success('Tarefa excluída com sucesso.')
      onSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir tarefa.')
    },
  })

  return (
    <ConfirmationDialogContent
      title="Você tem certeza absoluta?"
      description={
        <p>
          Esta ação não pode ser desfeita. Você está prestes a remover
          permanentemente a tarefa{' '}
          <span className="font-bold text-foreground">{taskTitle}</span>
        </p>
      }
      icon={<TrashIcon />}
      variant="destructive"
    >
      <AlertDialogAction
        onClick={(e) => {
          e.preventDefault()
          execute({ id: taskId })
        }}
        disabled={isExecuting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Continuar
      </AlertDialogAction>
    </ConfirmationDialogContent>
  )
}
