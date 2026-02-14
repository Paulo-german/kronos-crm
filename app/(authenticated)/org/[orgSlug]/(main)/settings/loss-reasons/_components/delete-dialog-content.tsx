'use client'

import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteLostReasonDialogContentProps {
  reasonName: string
  dealCount: number
  onDelete: () => void
  isDeleting?: boolean
}

const DeleteLostReasonDialogContent = ({
  reasonName,
  dealCount,
  onDelete,
  isDeleting = false,
}: DeleteLostReasonDialogContentProps) => {
  return (
    <ConfirmationDialogContent
      title="Deseja excluir o motivo de perda?"
      description={
        <div className="space-y-2">
          {dealCount > 0 ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Esta ação não pode ser desfeita. Você está prestes a remover
              permanentemente o motivo{' '}
              <span className="font-bold text-foreground">{reasonName}</span>{' '}
              que está sendo usado em <b>{dealCount} negociações.</b> Se optar
              por excluir, lembre-se que não será possível recuperar a
              informação.
            </div>
          ) : (
            <p>
              Esta ação não pode ser desfeita. Você está prestes a remover
              permanentemente o motivo{' '}
              <span className="font-bold text-foreground">{reasonName}</span>.
            </p>
          )}
        </div>
      }
      icon={<TrashIcon />}
      variant="destructive"
    >
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        disabled={isDeleting}
        onClick={(e) => {
          e.preventDefault()
          onDelete()
        }}
      >
        {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
      </AlertDialogAction>
    </ConfirmationDialogContent>
  )
}

export default DeleteLostReasonDialogContent
