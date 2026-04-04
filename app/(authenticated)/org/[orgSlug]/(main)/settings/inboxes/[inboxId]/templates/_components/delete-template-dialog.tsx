'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { deleteWhatsAppTemplate } from '@/_actions/inbox/delete-whatsapp-template'

interface DeleteTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inboxId: string
  templateName: string
  onDeleted: () => void
}

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  inboxId,
  templateName,
  onDeleted,
}: DeleteTemplateDialogProps) {
  const { execute, isPending } = useAction(deleteWhatsAppTemplate, {
    onSuccess: () => {
      toast.success(`Template "${templateName}" deletado com sucesso.`)
      onOpenChange(false)
      onDeleted()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao deletar o template.')
    },
  })

  const handleConfirm = () => {
    execute({ inboxId, templateName })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar template?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso irá deletar o template{' '}
            <strong className="font-semibold text-foreground">
              &ldquo;{templateName}&rdquo;
            </strong>{' '}
            em <strong className="font-semibold text-foreground">todos os idiomas</strong>.
            Esta ação não pode ser desfeita e o template precisará ser recriado e aprovado
            pelo Meta novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deletando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
