'use client'

import { useState, useEffect } from 'react'
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
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface InboxClientProps {
  conversations: ConversationListDto[]
}

const REFRESH_INTERVAL_MS = 5_000

export function InboxClient({ conversations }: InboxClientProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null,
  )

  // Polling para atualizar lista de conversas via server
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [router])

  // Se a conversa selecionada não existe mais na lista, resetar
  useEffect(() => {
    if (selectedId && !conversations.find((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0]?.id ?? null)
    }
  }, [conversations, selectedId])

  if (conversations.length === 0) {
    return <EmptyInbox />
  }

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
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
                <CardTitle className="text-base">Selecione uma conversa</CardTitle>
                <CardDescription>
                  Escolha uma conversa na lista ao lado para visualizar as
                  mensagens e interagir.
                </CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
