'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ScrollText,
  Copy,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
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
import { regenerateWebhookToken } from '@/_actions/webhook-source/regenerate-webhook-token'
import type { WebhookSourceDto } from '@/_actions/webhook-source/schema'

interface TableDropdownMenuProps {
  source: WebhookSourceDto
  onEdit: (source: WebhookSourceDto) => void
  onViewLogs: (sourceId: string) => void
  onDelete: (source: WebhookSourceDto) => void
}

export function TableDropdownMenu({
  source,
  onEdit,
  onViewLogs,
  onDelete,
}: TableDropdownMenuProps) {
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false)

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? '')

  const url = `${origin}/api/webhooks/incoming/${source.token}`

  const { execute: executeRegenerate, isPending: isRegenerating } = useAction(
    regenerateWebhookToken,
    {
      onSuccess: () => {
        toast.success('Token regenerado com sucesso! Atualize a URL no sistema externo.')
        setConfirmRegenerateOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao regenerar token.')
      },
    },
  )

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    toast.success('URL copiada para a área de transferência.')
  }

  const handleConfirmRegenerate = () => {
    executeRegenerate({ id: source.id })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem className="gap-1.5" onSelect={() => onEdit(source)}>
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-1.5" onSelect={() => onViewLogs(source.id)}>
            <ScrollText className="h-4 w-4" />
            Ver logs
          </DropdownMenuItem>

          <DropdownMenuItem className="gap-1.5" onSelect={handleCopyUrl}>
            <Copy className="h-4 w-4" />
            Copiar URL
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="gap-1.5 text-amber-600 focus:text-amber-600"
            onSelect={() => setConfirmRegenerateOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerar token
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-1.5 text-destructive focus:text-destructive"
            onSelect={() => onDelete(source)}
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmação de regeneração de token */}
      <AlertDialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar token?</AlertDialogTitle>
            <AlertDialogDescription>
              O token atual de{' '}
              <span className="font-semibold text-foreground">{source.name}</span>{' '}
              será invalidado imediatamente. Qualquer sistema usando a URL antiga
              deixará de funcionar até que a nova URL seja configurada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              disabled={isRegenerating}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isRegenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerando...
                </span>
              ) : (
                'Regenerar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
