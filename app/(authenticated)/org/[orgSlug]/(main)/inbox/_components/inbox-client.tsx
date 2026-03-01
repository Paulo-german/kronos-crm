'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { ConversationList } from './conversation-list'
import { ChatView } from './chat-view'
import { EmptyInbox } from './empty-inbox'
import { InboxSelector } from './inbox-selector'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface InboxOption {
  id: string
  name: string
  channel: string
}

interface InboxClientProps {
  conversations: ConversationListDto[]
  inboxOptions: InboxOption[]
  orgSlug: string
}

const REFRESH_INTERVAL_MS = 5_000

export function InboxClient({ conversations, inboxOptions, orgSlug }: InboxClientProps) {
  const router = useRouter()
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Filtrar conversas pela inbox selecionada
  const filteredConversations = useMemo(() => {
    if (!selectedInboxId) return conversations
    return conversations.filter(
      (conversation) => conversation.inboxId === selectedInboxId,
    )
  }, [conversations, selectedInboxId])

  // Inicializar selectedId quando conversas mudam
  useEffect(() => {
    if (!selectedId || !filteredConversations.find((conversation) => conversation.id === selectedId)) {
      setSelectedId(filteredConversations[0]?.id ?? null)
    }
  }, [filteredConversations, selectedId])

  // Polling para atualizar lista de conversas via server
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [router])

  // Se não tem nenhuma inbox, mostrar empty state com CTA
  if (inboxOptions.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} hasNoInbox />
  }

  // Se tem inboxes mas sem conversas
  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
        <InboxSelector
          inboxOptions={inboxOptions}
          selectedInboxId={selectedInboxId}
          onSelect={setSelectedInboxId}
          orgSlug={orgSlug}
        />
        <EmptyInbox orgSlug={orgSlug} />
      </div>
    )
  }

  const selectedConversation = filteredConversations.find(
    (conversation) => conversation.id === selectedId,
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      {/* Inbox selector no topo */}
      <InboxSelector
        inboxOptions={inboxOptions}
        selectedInboxId={selectedInboxId}
        onSelect={setSelectedInboxId}
        orgSlug={orgSlug}
      />

      {/* Main layout: sidebar + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Chat panel */}
        <div className="flex flex-1 flex-col">
          {selectedConversation ? (
            <ChatView
              key={selectedConversation.id}
              conversation={selectedConversation}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <Card className="max-w-sm border-border/50 bg-secondary/20">
                <CardHeader className="items-center pb-3 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">
                    {filteredConversations.length === 0
                      ? 'Nenhuma conversa nesta caixa'
                      : 'Selecione uma conversa'}
                  </CardTitle>
                  <CardDescription>
                    {filteredConversations.length === 0
                      ? 'Esta caixa de entrada ainda não possui conversas.'
                      : 'Escolha uma conversa na lista ao lado para visualizar as mensagens e interagir.'}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
