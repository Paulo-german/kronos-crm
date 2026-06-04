'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ShieldOff, Trash2 } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'

import type { EmailBlocklistDto } from '@/_data-access/privacy/get-email-blocklist'
import { removeEmailBlocklist } from '@/_actions/privacy/remove-email-blocklist'

interface BlocklistTabProps {
  entries: EmailBlocklistDto[]
}

export const BlocklistTab = ({ entries }: BlocklistTabProps) => {
  const router = useRouter()

  const { execute, isPending } = useAction(removeEmailBlocklist, {
    onSuccess: () => {
      toast.success('E-mail removido da lista de saída.', { position: 'bottom-right' })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover e-mail.', { position: 'bottom-right' })
    },
  })

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-12 text-center">
        <ShieldOff className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Lista de saída vazia</p>
        <p className="mt-1 text-xs text-muted-foreground">
          E-mails de contatos anonimizados aparecem aqui como registro histórico.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Registro histórico de e-mails que solicitaram saída. Informacional — não bloqueia novos cadastros.
      </p>

      <div className="rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className="font-mono text-sm">{entry.email}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {entry.reason === 'GDPR_ERASURE' ? 'Exclusão LGPD/GDPR' : entry.reason}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {format(entry.blockedAt, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover da lista de saída?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O e-mail <strong>{entry.email}</strong> será removido do registro histórico. Esta ação não afeta outros dados do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => execute({ id: entry.id })}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
