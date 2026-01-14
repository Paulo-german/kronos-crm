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
import { deleteProduct } from '@/_actions/product/delete-product'

interface DeleteProductDialogContentProps {
  productId: string
}

const DeleteProductDialogContent = ({
  productId,
}: DeleteProductDialogContentProps) => {
  const { execute: executeDelete } = useAction(deleteProduct, {
    onSuccess: () => {
      toast.success('Produto excluído com sucesso.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir produto.')
    },
  })

  const handleContinueClick = () => executeDelete({ id: productId })

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
        <AlertDialogDescription>
          Essa ação não pode ser desfeita. Isso excluirá permanentemente o
          produto do catálogo.
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

export default DeleteProductDialogContent
