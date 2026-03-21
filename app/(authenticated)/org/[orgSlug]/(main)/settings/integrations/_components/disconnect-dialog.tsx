'use client'

import { Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import { disconnectIntegration } from '@/_actions/integration/disconnect-integration'

interface DisconnectDialogProps {
  integrationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DisconnectDialog = ({
  integrationId,
  open,
  onOpenChange,
}: DisconnectDialogProps) => {
  const { execute, isPending } = useAction(disconnectIntegration, {
    onSuccess: () => {
      toast.success('Google Calendar desconectado.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao desconectar. Tente novamente.')
    },
  })

  const handleConfirm = () => {
    execute({ integrationId })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar Google Calendar?</AlertDialogTitle>
          <AlertDialogDescription>
            Os agendamentos sincronizados permanecerão no CRM, mas não serão
            mais atualizados automaticamente.
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
                Desconectando...
              </>
            ) : (
              'Desconectar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DisconnectDialog
