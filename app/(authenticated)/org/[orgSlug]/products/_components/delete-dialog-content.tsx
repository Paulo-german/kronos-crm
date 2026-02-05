'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { AlertDialogAction } from '@/_components/ui/alert-dialog'
import { deleteProduct } from '@/_actions/product/delete-product'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'
import { TrashIcon } from 'lucide-react'

interface DeleteProductDialogContentProps {
  productId: string
  productName: string
}

const DeleteProductDialogContent = ({
  productId,
  productName,
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
    <ConfirmationDialogContent
      title="Você tem certeza absoluta?"
      description={
        <p>
          Esta ação não pode ser desfeita. Você está prestes a remover
          permanentemente o produto{' '}
          <span className="font-bold text-foreground">{productName}</span> do
          catálogo.
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

export default DeleteProductDialogContent
