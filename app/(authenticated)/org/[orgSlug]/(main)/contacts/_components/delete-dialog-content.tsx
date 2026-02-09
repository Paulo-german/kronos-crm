'use client'

import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteContactDialogContentProps {
  contactName: string
  onDelete: () => void
}

const DeleteContactDialogContent = ({
  contactName,
  onDelete,
}: DeleteContactDialogContentProps) => {

  return (
    <ConfirmationDialogContent
      title="Você tem certeza absoluta?"
      description={
        <p>
          Esta ação não pode ser desfeita. Você está prestes a remover
          permanentemente o contato{' '}
          <span className="font-bold text-foreground">{contactName}</span>
        </p>
      }
      icon={<TrashIcon />}
      variant="destructive"
    >
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onDelete}
      >
        Continuar
      </AlertDialogAction>
    </ConfirmationDialogContent>
  )
}

export default DeleteContactDialogContent
