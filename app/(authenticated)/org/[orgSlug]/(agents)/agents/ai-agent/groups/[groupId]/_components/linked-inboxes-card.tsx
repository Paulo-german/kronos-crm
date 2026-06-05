'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { InboxIcon, ExternalLinkIcon, LinkIcon, TrashIcon, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { linkInboxToGroup } from '@/_actions/agent-group/link-inbox-to-group'
import type { AgentGroupDetailDto } from '@/_data-access/agent-group/get-agent-group-by-id'
import type { InboxListDto } from '@/_data-access/inbox/get-inboxes'

// Rótulos legíveis para os canais de inbox
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  webchat: 'Webchat',
  email: 'E-mail',
}

function getChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel.toLowerCase()] ?? channel
}

interface LinkedInboxesCardProps {
  groupId: string
  inboxes: AgentGroupDetailDto['inboxes']
  availableInboxes: InboxListDto[]
  orgSlug: string
}

export function LinkedInboxesCard({
  groupId,
  inboxes,
  availableInboxes,
  orgSlug,
}: LinkedInboxesCardProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [selectedInboxId, setSelectedInboxId] = useState<string>('')
  const [unlinkingInboxId, setUnlinkingInboxId] = useState<string | null>(null)
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false)

  const { execute: executeLink, isPending: isLinking } = useAction(linkInboxToGroup, {
    onSuccess: () => {
      toast.success('Inbox vinculado à equipe.')
      setIsLinkDialogOpen(false)
      setSelectedInboxId('')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao vincular inbox.')
    },
  })

  const { execute: executeUnlink, isPending: isUnlinking } = useAction(linkInboxToGroup, {
    onSuccess: () => {
      toast.success('Inbox desvinculado da equipe.')
      setIsUnlinkDialogOpen(false)
      setUnlinkingInboxId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao desvincular inbox.')
    },
  })

  const handleConfirmUnlink = () => {
    if (!unlinkingInboxId) return
    executeUnlink({ inboxId: unlinkingInboxId, agentGroupId: null })
  }

  // Inboxes ainda não vinculados a este grupo (filtra os já vinculados)
  const linkedInboxIds = new Set(inboxes.map((inbox) => inbox.id))
  const selectableInboxes = availableInboxes.filter((inbox) => !linkedInboxIds.has(inbox.id))

  const unlinkingInbox = inboxes.find((inbox) => inbox.id === unlinkingInboxId)

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Inboxes vinculados</CardTitle>
              <CardDescription>
                Inboxes usando esta equipe de agentes para roteamento.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsLinkDialogOpen(true)}
              disabled={selectableInboxes.length === 0}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Vincular
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inboxes.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed">
              <InboxIcon className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhum inbox vinculado a esta equipe.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {inboxes.map((inbox) => (
                <div
                  key={inbox.id}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <InboxIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inbox.name}</p>
                      <p className="text-xs text-muted-foreground">{getChannelLabel(inbox.channel)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={inbox.isActive ? 'default' : 'secondary'} className="text-xs">
                      {inbox.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Link
                      href={`/org/${orgSlug}/inbox/settings/inboxes/${inbox.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      title="Configurar inbox"
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title="Desvincular inbox"
                      onClick={() => {
                        setUnlinkingInboxId(inbox.id)
                        setIsUnlinkDialogOpen(true)
                      }}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: vincular inbox */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular inbox</DialogTitle>
            <DialogDescription>
              Selecione um inbox para usar esta equipe de agentes no roteamento de conversas.
            </DialogDescription>
          </DialogHeader>

          <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um inbox" />
            </SelectTrigger>
            <SelectContent>
              {selectableInboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  <span className="flex items-center gap-2">
                    {inbox.name}
                    <span className="text-xs text-muted-foreground">
                      {getChannelLabel(inbox.channel)}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
              disabled={isLinking}
            >
              Cancelar
            </Button>
            <Button
              disabled={!selectedInboxId || isLinking}
              onClick={() => executeLink({ inboxId: selectedInboxId, agentGroupId: groupId })}
            >
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar desvinculação */}
      <ConfirmationDialog
        open={isUnlinkDialogOpen}
        onOpenChange={(open) => {
          setIsUnlinkDialogOpen(open)
          if (!open) setUnlinkingInboxId(null)
        }}
        variant="destructive"
        title="Desvincular inbox"
        description={
          <span>
            Tem certeza que deseja desvincular{' '}
            <strong className="text-foreground">{unlinkingInbox?.name}</strong>?
            <br />
            As conversas ativas perderão o agente atribuído e o inbox deixará de usar esta equipe.
          </span>
        }
        icon={<TrashIcon className="h-6 w-6" />}
        onConfirm={handleConfirmUnlink}
        isLoading={isUnlinking}
        confirmLabel="Desvincular"
      />
    </>
  )
}
