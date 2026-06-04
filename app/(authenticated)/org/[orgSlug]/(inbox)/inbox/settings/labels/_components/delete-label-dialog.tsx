'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import { deleteLabel } from '@/_actions/conversation-label/delete-label'

interface DeleteLabelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  labelId: string
  labelName: string
}

const DeleteLabelDialog = ({
  open,
  onOpenChange,
  labelId,
  labelName,
}: DeleteLabelDialogProps) => {
  const { execute, isPending } = useAction(deleteLabel, {
    onSuccess: () => {
      toast.success('Etiqueta removida com sucesso.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover etiqueta.')
    },
  })

  const handleConfirm = () => {
    execute({ id: labelId })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover etiqueta?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar a etiqueta{' '}
            <strong className="font-semibold text-foreground">
              &ldquo;{labelName}&rdquo;
            </strong>
            ? Ela será removida de todas as conversas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              'Remover'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteLabelDialog
