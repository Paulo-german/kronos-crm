'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { ptBR } from 'date-fns/locale'
import { Loader2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { replayWebhookLog } from '@/_actions/webhook-source/replay-webhook-log'
import type { WebhookLogDto } from '@/_actions/webhook-source/schema'

const STATUS_BADGE_MAP: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
  PROCESSED: { variant: 'default', label: 'Processado' },
  ERROR: { variant: 'destructive', label: 'Erro' },
  IGNORED: { variant: 'secondary', label: 'Ignorado' },
}

interface WebhookLogDetailDialogProps {
  log: WebhookLogDto
  orgSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReplaySuccess?: () => void
}

export function WebhookLogDetailDialog({
  log,
  orgSlug,
  open,
  onOpenChange,
  onReplaySuccess,
}: WebhookLogDetailDialogProps) {
  const { execute: executeReplay, isPending: isReplaying } = useAction(
    replayWebhookLog,
    {
      onSuccess: () => {
        toast.success('Log reprocessado com sucesso!')
        onOpenChange(false)
        onReplaySuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao reprocessar log.')
      },
    },
  )

  const statusConfig = STATUS_BADGE_MAP[log.status] ?? STATUS_BADGE_MAP.IGNORED

  const formattedDate = formatDistanceToNow(new Date(log.receivedAt), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            <DialogTitle className="text-base">Detalhes do log</DialogTitle>
          </div>
          <DialogDescription>
            Recebido {formattedDate}
            {log.externalEventId && (
              <span className="ml-2 font-mono text-xs">
                • ID: {log.externalEventId}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Links para contato/deal criados pelo webhook */}
        {(log.contactId ?? log.dealId) && (
          <div className="flex gap-2">
            {log.contactId && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a
                  href={`/org/${orgSlug}/contacts/${log.contactId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver contato
                </a>
              </Button>
            )}
            {log.dealId && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a
                  href={`/org/${orgSlug}/deals/${log.dealId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver deal
                </a>
              </Button>
            )}
          </div>
        )}

        {log.errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">Mensagem de erro</p>
            <p className="mt-1 font-mono text-xs text-destructive/80">{log.errorMessage}</p>
          </div>
        )}

        <Tabs defaultValue="payload">
          <TabsList className="grid h-12 w-full grid-cols-2 border-b border-border/50 bg-tab/30">
            <TabsTrigger
              value="payload"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Payload recebido
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Dados resolvidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payload">
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="resolved">
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
              {JSON.stringify(log.resolvedData, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col items-end gap-2 sm:flex-row sm:items-center">
          {log.status === 'PROCESSED' && (
            <p className="text-xs text-muted-foreground sm:mr-auto">
              Este evento já foi processado. Reprocessar pode criar duplicatas.
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReplaying}
          >
            Fechar
          </Button>
          <Button
            variant={log.status === 'PROCESSED' ? 'outline' : 'default'}
            onClick={() => executeReplay({ logId: log.id })}
            disabled={isReplaying}
          >
            {isReplaying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reprocessando...
              </span>
            ) : (
              'Reprocessar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
