'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { deleteTask } from '@/_actions/task/delete-task'

interface DeleteTaskDialogContentProps {
  taskId: string
  onSuccess?: () => void
}

export function DeleteTaskDialogContent({
  taskId,
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
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. Isso excluirá permanentemente a
          tarefa.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault()
            execute({ id: taskId })
          }}
          disabled={isExecuting}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Excluir
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
