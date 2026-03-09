'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { Loader2, MessageSquarePlus, AlertTriangle, Phone } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Avatar,
  AvatarFallback,
} from '@/_components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import { createConversation } from '@/_actions/inbox/create-conversation'

interface InboxOption {
  id: string
  name: string
  channel: string
  isConnected: boolean
}

interface StartConversationPanelProps {
  contact: { id: string; name: string; phone: string | null }
  inboxOptions: InboxOption[]
  orgSlug: string
  onConversationCreated: (conversation: ConversationListDto) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function StartConversationPanel({
  contact,
  inboxOptions,
  orgSlug,
  onConversationCreated,
}: StartConversationPanelProps) {
  const connectedInboxes = useMemo(
    () => inboxOptions.filter((inbox) => inbox.channel === 'WHATSAPP' && inbox.isConnected),
    [inboxOptions],
  )

  const [selectedInboxId, setSelectedInboxId] = useState<string>(
    connectedInboxes.length === 1 ? connectedInboxes[0]!.id : '',
  )

  const { execute, isPending } = useAction(createConversation, {
    onSuccess: ({ data }) => {
      if (data?.conversation) {
        toast.success('Conversa iniciada com sucesso!')
        onConversationCreated(data.conversation)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar conversa.')
    },
  })

  const hasNoPhone = !contact.phone
  const hasNoConnectedInbox = connectedInboxes.length === 0
  const isDisabled = isPending || hasNoPhone || hasNoConnectedInbox || !selectedInboxId

  const handleCreate = () => {
    if (!selectedInboxId) return
    execute({ contactId: contact.id, inboxId: selectedInboxId })
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/50 bg-secondary/20">
        <CardHeader className="items-center pb-3 text-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-lg text-primary">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-base">{contact.name}</CardTitle>
          {contact.phone && (
            <CardDescription className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Este contato ainda não possui uma conversa.
          </p>

          {hasNoPhone && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Contato sem telefone cadastrado. Adicione um telefone para iniciar uma conversa.</span>
            </div>
          )}

          {hasNoConnectedInbox && !hasNoPhone && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span>Nenhuma caixa conectada ao WhatsApp. </span>
                <Link
                  href={`/org/${orgSlug}/settings/inboxes`}
                  className="font-medium underline underline-offset-2"
                >
                  Configurar caixas
                </Link>
              </div>
            </div>
          )}

          {!hasNoPhone && connectedInboxes.length > 1 && (
            <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma caixa" />
              </SelectTrigger>
              <SelectContent>
                {connectedInboxes.map((inbox) => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!hasNoPhone && connectedInboxes.length === 1 && (
            <p className="text-center text-xs text-muted-foreground">
              Caixa: {connectedInboxes[0]!.name}
            </p>
          )}

          <Button
            className="w-full"
            disabled={isDisabled}
            onClick={handleCreate}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="mr-2 h-4 w-4" />
            )}
            Iniciar Conversa
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
