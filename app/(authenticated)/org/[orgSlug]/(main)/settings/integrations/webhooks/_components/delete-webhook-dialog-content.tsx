'use client'

import { Loader2 } from 'lucide-react'
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
import type { WebhookSourceDto } from '@/_actions/webhook-source/schema'

interface DeleteWebhookDialogContentProps {
  source: WebhookSourceDto
  onConfirm: () => void
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWebhookDialogContent({
  source,
  onConfirm,
  isPending,
  open,
  onOpenChange,
}: DeleteWebhookDialogContentProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            O webhook{' '}
            <span className="font-semibold text-foreground">{source.name}</span>{' '}
            será deletado permanentemente. Todos os logs e o token associado
            serão removidos. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deletando...
              </span>
            ) : (
              'Deletar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
