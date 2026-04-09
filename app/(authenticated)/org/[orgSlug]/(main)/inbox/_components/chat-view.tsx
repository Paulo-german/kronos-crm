'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Separator } from '@/_components/ui/separator'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { sendMessage } from '@/_actions/inbox/send-message'
import { sendAudio } from '@/_actions/inbox/send-audio'
import { sendMedia } from '@/_actions/inbox/send-media'
import { retryFailedMessage } from '@/_actions/inbox/retry-failed-message'
import { toggleAiPause } from '@/_actions/inbox/toggle-ai-pause'
import { resolveConversation } from '@/_actions/inbox/resolve-conversation'
import { reopenConversation } from '@/_actions/inbox/reopen-conversation'
import {
  ALL_ACCEPTED_MEDIA_TYPES,
  getMaxSizeForMimetype,
} from '@/_lib/whatsapp/media-constants'
import type { ConversationListDto, ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { useChatMessages } from '../_hooks/use-chat-messages'
import { useAudioRecorder } from '../_hooks/use-audio-recorder'
import { useConversationWindow } from '../_hooks/use-conversation-window'
import { ChatHeader } from './chat-header'
import { ChatBanners } from './chat-banners'
import { ChatMessageList } from './chat-message-list'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ChatSettingsSheet } from './chat-settings-sheet'
import { TemplateMessageDialog } from './template-message-dialog'
import { ConversationWindowBanner } from './conversation-window-banner'
import type { MessageDto, TimelineItem } from './chat-types'

interface ChatViewProps {
  conversation: ConversationListDto
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
  members: AcceptedMemberDto[]
  isElevated: boolean
  currentUserId: string
  availableLabels: ConversationLabelDto[]
  onToggleAiPause?: (conversationId: string, aiPaused: boolean) => void
  onStatusChange?: (conversationId: string, status: 'OPEN' | 'RESOLVED') => void
  onBack?: () => void
}

export function ChatView({ conversation, dealOptions, contactOptions, orgSlug, members, isElevated, availableLabels, onToggleAiPause, onStatusChange, onBack }: ChatViewProps) {
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null)

  const isMetaCloud = conversation.inboxConnectionType === 'META_CLOUD'
  const mediaPreviewUrlRef = useRef<string | null>(null)

  const windowState = useConversationWindow(
    conversation.lastCustomerMessageAt ? new Date(conversation.lastCustomerMessageAt) : null,
    conversation.inboxConnectionType,
  )
  const isWindowClosed = windowState.isMetaCloud && !windowState.isOpen
  const chatInputRef = useRef<ChatInputHandle>(null)

  useEffect(() => {
    chatInputRef.current?.focus()
  }, [])

  // Limpar arquivo selecionado ao trocar de conversa
  useEffect(() => {
    if (mediaPreviewUrlRef.current) URL.revokeObjectURL(mediaPreviewUrlRef.current)
    setSelectedFile(null)
    setMediaPreviewUrl(null)
    mediaPreviewUrlRef.current = null
  }, [conversation.id])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (mediaPreviewUrlRef.current) URL.revokeObjectURL(mediaPreviewUrlRef.current)
    }
  }, [])

  const {
    messages,
    events,
    aiPaused,
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
    onSuccess: (result) => {
      setText('')
      chatInputRef.current?.focus()
      fetchMessages()
      if (result.data?.sendFailed) {
        toast.error(result.data.errorMessage ?? 'Falha no envio. Verifique no chat.')
      }
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

  const resolveAction = useAction(resolveConversation, {
    onSuccess: () => {
      toast.success('Conversa resolvida.')
      onStatusChange?.(conversation.id, 'RESOLVED')
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao resolver conversa.')
    },
  })

  const reopenAction = useAction(reopenConversation, {
    onSuccess: () => {
      toast.success('Conversa reaberta.')
      onStatusChange?.(conversation.id, 'OPEN')
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao reabrir conversa.')
    },
  })

  const sendAudioAction = useAction(sendAudio, {
    onSuccess: (result) => {
      fetchMessages()
      if (result.data?.sendFailed) {
        toast.error(result.data.errorMessage ?? 'Falha no envio do áudio. Verifique no chat.')
      }
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar áudio')
    },
  })

  const handleFileRemove = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setSelectedFile(null)
    setMediaPreviewUrl(null)
    mediaPreviewUrlRef.current = null
  }

  const sendMediaAction = useAction(sendMedia, {
    onSuccess: (result) => {
      handleFileRemove()
      setText('')
      chatInputRef.current?.focus()
      fetchMessages()
      if (result.data?.sendFailed) {
        toast.error(result.data.errorMessage ?? 'Falha no envio do arquivo. Verifique no chat.')
      }
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar arquivo')
    },
  })

  const retryAction = useAction(retryFailedMessage, {
    onSuccess: () => {
      setRetryingMessageId(null)
      fetchMessages()
      toast.success('Mensagem reenviada.')
    },
    onError: (error) => {
      setRetryingMessageId(null)
      toast.error(error.error?.serverError ?? 'Erro ao reenviar mensagem.')
    },
  })

  const handleRetryMessage = (messageId: string) => {
    setRetryingMessageId(messageId)
    retryAction.execute({ messageId })
  }

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
    onToggleAiPause?.(conversation.id, newPaused)
    toggleAction.execute({
      conversationId: conversation.id,
      aiPaused: newPaused,
    })
  }

  const handleFileSelect = (file: File) => {
    if (!ALL_ACCEPTED_MEDIA_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado.')
      return
    }
    const maxSize = getMaxSizeForMimetype(file.type)
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      toast.error(`Arquivo muito grande. Máximo: ${maxMB}MB.`)
      return
    }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setSelectedFile(file)
    setMediaPreviewUrl(preview)
    mediaPreviewUrlRef.current = preview
  }

  const handleSendMedia = () => {
    if (!selectedFile || sendMediaAction.isPending) return

    try {
      const reader = new FileReader()
      reader.onerror = () => {
        toast.error('Erro ao ler o arquivo.')
      }
      reader.onloadend = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        if (!base64) {
          toast.error('Erro ao processar arquivo.')
          return
        }
        sendMediaAction.execute({
          conversationId: conversation.id,
          mediaBase64: base64,
          mimetype: selectedFile.type,
          fileName: selectedFile.name,
          caption: text.trim() || undefined,
        })
      }
      reader.readAsDataURL(selectedFile)
    } catch {
      toast.error('Erro ao processar arquivo.')
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <ChatHeader
          contactName={conversation.contactName}
          contactPhone={conversation.contactPhone}
          agentName={conversation.agentName}
          agentGroupName={conversation.agentGroupName}
          activeAgentName={conversation.activeAgentName}
          aiPaused={aiPaused}
          isTogglePending={toggleAction.isPending}
          onToggleAi={handleToggleAi}
          onOpenSettings={() => setSettingsOpen(true)}
          assigneeName={conversation.assigneeName}
          onBack={onBack}
          conversationStatus={conversation.status}
          isStatusPending={resolveAction.isPending || reopenAction.isPending}
          onResolve={() => resolveAction.execute({ conversationId: conversation.id })}
          onReopen={() => reopenAction.execute({ conversationId: conversation.id })}
          windowState={windowState}
        />
        <ChatBanners
          connectionError={connectionError}
          aiPaused={aiPaused}
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
          onRetryMessage={handleRetryMessage}
          retryingMessageId={retryingMessageId}
        />
        <Separator />
        <ConversationWindowBanner
          windowState={windowState}
          onOpenTemplateDialog={() => setTemplateDialogOpen(true)}
        />
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
          selectedFile={selectedFile}
          mediaPreviewUrl={mediaPreviewUrl}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          onSendMedia={handleSendMedia}
          isMediaPending={sendMediaAction.isPending}
          onOpenTemplateDialog={isMetaCloud ? () => setTemplateDialogOpen(true) : undefined}
          windowClosed={isWindowClosed}
        />
        {isMetaCloud && (
          <TemplateMessageDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            conversationId={conversation.id}
            inboxId={conversation.inboxId}
            orgSlug={orgSlug}
            onSent={() => {
              fetchMessages()
              chatInputRef.current?.focus()
            }}
          />
        )}
        <ChatSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          conversation={conversation}
          dealOptions={dealOptions}
          contactOptions={contactOptions}
          orgSlug={orgSlug}
          members={members}
          isElevated={isElevated}
          availableLabels={availableLabels}
        />
      </div>
    </TooltipProvider>
  )
}
