'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import { deleteContact } from '@/_actions/contact/delete-contact'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteContactDialogContentProps {
  contactId: string
  contactName: string
}

const DeleteContactDialogContent = ({
  contactId,
  contactName,
}: DeleteContactDialogContentProps) => {
  const { execute: executeDelete } = useAction(deleteContact, {
    onSuccess: () => {
      console.log('Contato excluído com sucesso.')
      toast.success('Contato excluído com sucesso.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir contato.')
    },
  })

  const handleContinueClick = () => executeDelete({ id: contactId })

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
        onClick={handleContinueClick}
      >
        Continuar
      </AlertDialogAction>
    </ConfirmationDialogContent>
  )
}

export default DeleteContactDialogContent
