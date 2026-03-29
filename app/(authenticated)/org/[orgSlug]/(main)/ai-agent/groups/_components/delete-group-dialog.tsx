'use client'

import { TrashIcon } from 'lucide-react'
import ConfirmationDialog from '@/_components/confirmation-dialog'

interface DeleteGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  onConfirm: () => void
  isLoading: boolean
}

export function DeleteGroupDialog({
  open,
  onOpenChange,
  groupName,
  onConfirm,
  isLoading,
}: DeleteGroupDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Excluir equipe"
      description={
        <span>
          Tem certeza que deseja excluir a equipe{' '}
          <strong className="text-foreground">{groupName}</strong>?
          <br />
          Os inboxes vinculados serão desvinculados e as conversas ativas perderão o agente
          atribuído. Esta ação não pode ser desfeita.
        </span>
      }
      icon={<TrashIcon className="h-6 w-6" />}
      onConfirm={onConfirm}
      isLoading={isLoading}
      confirmLabel="Excluir equipe"
    />
  )
}
