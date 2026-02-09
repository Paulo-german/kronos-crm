'use client'

import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteTaskDialogContentProps {
  taskTitle: string
  onDelete: () => void
}

export function DeleteTaskDialogContent({
  taskTitle,
  onDelete,
}: DeleteTaskDialogContentProps) {
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
          onDelete()
        }}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Continuar
      </AlertDialogAction>
    </ConfirmationDialogContent>
  )
}
