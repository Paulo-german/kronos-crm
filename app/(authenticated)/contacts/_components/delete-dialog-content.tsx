'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { deleteContact } from '@/_actions/contact/delete-contact'

interface DeleteContactDialogContentProps {
  contactId: string
}

const DeleteContactDialogContent = ({
  contactId,
}: DeleteContactDialogContentProps) => {
  const { execute: executeDelete } = useAction(deleteContact, {
    onSuccess: () => {
      toast.success('Contato excluído com sucesso.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir contato.')
    },
  })

  const handleContinueClick = () => executeDelete({ id: contactId })

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
        <AlertDialogDescription>
          Essa ação não pode ser desfeita. Isso excluirá permanentemente o
          contato.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleContinueClick}>
          Continuar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

export default DeleteContactDialogContent
