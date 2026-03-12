'use client'

import { useState, useRef, useMemo } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Separator } from '@/_components/ui/separator'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { sendMessage } from '@/_actions/inbox/send-message'
import { sendAudio } from '@/_actions/inbox/send-audio'
import { toggleAiPause } from '@/_actions/inbox/toggle-ai-pause'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import { useChatMessages } from '../_hooks/use-chat-messages'
import { useAudioRecorder } from '../_hooks/use-audio-recorder'
import { ChatHeader } from './chat-header'
import { ChatBanners } from './chat-banners'
import { ChatMessageList } from './chat-message-list'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ChatSettingsSheet } from './chat-settings-sheet'
import type { MessageDto, TimelineItem } from './chat-types'

interface ChatViewProps {
  conversation: ConversationListDto
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
}

export function ChatView({ conversation, dealOptions, contactOptions, orgSlug }: ChatViewProps) {
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chatInputRef = useRef<ChatInputHandle>(null)

  const {
    messages,
    events,
    aiPaused,
    pausedAt,
    isLoadingMessages,
    hasMore,
    isLoadingMore,
    connectionError,
    setAiPaused,
    togglePendingRef,
    fetchMessages,
    loadOlderMessages,
    scrollRef,
    scrollAreaRef,
  } = useChatMessages({
    conversationId: conversation.id,
    initialAiPaused: conversation.aiPaused,
    initialPausedAt: conversation.pausedAt,
  })

  // Actions
  const sendAction = useAction(sendMessage, {
    onSuccess: () => {
      setText('')
      chatInputRef.current?.focus()
      fetchMessages()
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar mensagem')
    },
  })

  const toggleAction = useAction(toggleAiPause, {
    onSuccess: () => {
      const wasPaused = togglePendingRef.current
      togglePendingRef.current = null
      toast.success(wasPaused ? 'IA pausada' : 'IA reativada')
    },
    onError: (error) => {
      if (togglePendingRef.current !== null) {
        setAiPaused(!togglePendingRef.current)
      }
      togglePendingRef.current = null
      toast.error(error.error?.serverError ?? 'Erro ao alterar estado da IA')
    },
  })

  const sendAudioAction = useAction(sendAudio, {
    onSuccess: () => {
      fetchMessages()
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar áudio')
    },
  })

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder({
    conversationId: conversation.id,
    onAudioReady: (base64, duration) => {
      sendAudioAction.execute({
        conversationId: conversation.id,
        audioBase64: base64,
        duration,
      })
    },
  })

  // Merge messages (expanded AI chunks) + events into a sorted timeline
  const displayTimeline = useMemo(() => {
    const expandedMessages: MessageDto[] = []
    for (const message of messages) {
      const meta = message.metadata as Record<string, unknown> | null
      const isAiGenerated = message.role === 'assistant' && !!meta?.model

      if (isAiGenerated) {
        const chunks = message.content
          .split(/\n\n+/)
          .map((chunk) => chunk.trim())
          .filter(Boolean)

        if (chunks.length > 1) {
          for (let index = 0; index < chunks.length; index++) {
            expandedMessages.push({
              ...message,
              id: `${message.id}-${index}`,
              content: chunks[index],
            })
          }
          continue
        }
      }

      expandedMessages.push(message)
    }

    type DataItem = Exclude<TimelineItem, { kind: 'day-separator' }>
    const timeline: DataItem[] = [
      ...expandedMessages.map((data) => ({ kind: 'message' as const, data })),
      ...events.map((data) => ({ kind: 'event' as const, data })),
    ]

    timeline.sort(
      (a, b) =>
        new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime(),
    )

    const withSeparators: TimelineItem[] = []
    let lastDateKey = ''

    for (const item of timeline) {
      const dateKey = new Date(item.data.createdAt).toLocaleDateString('en-CA')
      if (dateKey !== lastDateKey) {
        withSeparators.push({ kind: 'day-separator', date: dateKey })
        lastDateKey = dateKey
      }
      withSeparators.push(item)
    }

    return withSeparators
  }, [messages, events])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || sendAction.isPending) return

    sendAction.execute({
      conversationId: conversation.id,
      text: trimmed,
    })
  }

  const handleToggleAi = (checked: boolean) => {
    const newPaused = !checked
    setAiPaused(newPaused)
    togglePendingRef.current = newPaused
    toggleAction.execute({
      conversationId: conversation.id,
      aiPaused: newPaused,
    })
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <ChatHeader
          contactName={conversation.contactName}
          contactPhone={conversation.contactPhone}
          agentName={conversation.agentName}
          aiPaused={aiPaused}
          isTogglePending={toggleAction.isPending}
          onToggleAi={handleToggleAi}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ChatBanners
          connectionError={connectionError}
          aiPaused={aiPaused}
          pausedAt={pausedAt}
        />
        <ChatMessageList
          conversationId={conversation.id}
          displayTimeline={displayTimeline}
          isLoadingMessages={isLoadingMessages}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          messageCount={messages.length}
          scrollRef={scrollRef}
          scrollAreaRef={scrollAreaRef}
          onLoadMore={loadOlderMessages}
        />
        <Separator />
        <ChatInput
          ref={chatInputRef}
          text={text}
          onTextChange={setText}
          onSend={handleSend}
          isSendPending={sendAction.isPending}
          isAudioPending={sendAudioAction.isPending}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onCancelRecording={cancelRecording}
        />
        <ChatSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          conversation={conversation}
          dealOptions={dealOptions}
          contactOptions={contactOptions}
          orgSlug={orgSlug}
        />
      </div>
    </TooltipProvider>
  )
}
