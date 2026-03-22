'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, TriangleAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import { deleteFollowUp } from '@/_actions/follow-up/delete-follow-up'
import type { FollowUpDto } from '@/_data-access/follow-up/types'

interface DeleteFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  followUp: FollowUpDto
  onDeleteSuccess?: () => void
}

const DeleteFollowUpDialog = ({
  open,
  onOpenChange,
  followUp,
  onDeleteSuccess,
}: DeleteFollowUpDialogProps) => {
  const { execute, isPending } = useAction(deleteFollowUp, {
    onSuccess: () => {
      toast.success('Follow-up excluído com sucesso!')
      onDeleteSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir follow-up.')
    },
  })

  const handleConfirm = () => {
    execute({ id: followUp.id, agentId: followUp.agentId })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlert className="size-5 text-destructive" />
            </div>
            <AlertDialogTitle>Excluir follow-up?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-1">
            O follow-up{' '}
            <span className="font-semibold text-foreground">
              #{followUp.order + 1}
            </span>{' '}
            será removido permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteFollowUpDialog
