'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Separator } from '@/_components/ui/separator'
import { TooltipProvider } from '@/_components/ui/tooltip'
import {
  ALL_ACCEPTED_MEDIA_TYPES,
  getMaxSizeForMimetype,
} from '@/_lib/whatsapp/media-constants'
import type { ConversationListDto, ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { useInboxMessages } from '../_hooks/use-inbox-messages'
import { useInboxMutations } from '../_hooks/use-inbox-mutations'
import { inboxKeys } from '../_lib/inbox-query-keys'
import { useAudioRecorder } from '../_hooks/use-audio-recorder'
import { useConversationWindow } from '../_hooks/use-conversation-window'
import { ChatHeader } from './chat-header'
import { ChatBanners } from './chat-banners'
import { ChatMessageList } from './chat-message-list'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ChatSettingsSheet } from './chat-settings-sheet'
import { TemplateMessageDialog } from './template-message-dialog'
import { ConversationWindowBanner } from './conversation-window-banner'
import { AgentTypingIndicator } from './agent-typing-indicator'
import type { MessageDto, TimelineItem } from './chat-types'
import type { AgentStatusPayload } from '@/_lib/inbox/agent-status-types'

interface ChatViewProps {
  conversation: ConversationListDto
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
  members: AcceptedMemberDto[]
  isElevated: boolean
  availableLabels: ConversationLabelDto[]
  onToggleAiPause?: (conversationId: string, aiPaused: boolean) => void
  onStatusChange?: (conversationId: string, status: 'OPEN' | 'RESOLVED') => void
  onBack?: () => void
  onSimulatorEnded?: () => void
  /** Função de lookup do Map de status do agente — injetada pelo InboxClient */
  getAgentStatus?: (conversationId: string) => AgentStatusPayload | null
}

export function ChatView({ conversation, dealOptions, contactOptions, orgSlug, members, isElevated, availableLabels, onToggleAiPause, onStatusChange, onBack, onSimulatorEnded, getAgentStatus }: ChatViewProps) {
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const isMetaCloud = conversation.inboxConnectionType === 'META_CLOUD'
  // Simulador: usa pipeline diferente de envio, esconde controles específicos de WhatsApp
  const isSimulator = conversation.inboxConnectionType === 'SIMULATOR'
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
    loadOlderMessages,
    scrollRef,
    scrollAreaRef,
  } = useInboxMessages({ conversationId: conversation.id })

  const mutations = useInboxMutations({
    availableLabels,
    members,
    statusFilter: conversation.status,
  })

  const handleFileRemove = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setSelectedFile(null)
    setMediaPreviewUrl(null)
    mediaPreviewUrlRef.current = null
  }

  const handleRetryMessage = (messageId: string) => {
    setRetryingMessageId(messageId)
    mutations.retryFailedMessage.mutate(
      { messageId, conversationId: conversation.id },
      {
        onSuccess: () => {
          setRetryingMessageId(null)
          toast.success('Mensagem reenviada.')
        },
        onError: () => {
          setRetryingMessageId(null)
          toast.error('Erro ao reenviar mensagem.')
        },
      },
    )
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
      mutations.sendAudio.mutate(
        { conversationId: conversation.id, audioBase64: base64, duration },
        {
          onSuccess: (result) => {
            if (result?.data?.sendFailed) {
              toast.error(result.data.errorMessage ?? 'Falha no envio do áudio. Verifique no chat.')
            }
          },
          onError: () => toast.error('Erro ao enviar áudio'),
        },
      )
    },
  })

  // Merge messages (expanded AI chunks) + events into a sorted timeline
  const displayTimeline = useMemo(() => {
    const expandedMessages: MessageDto[] = []
    for (const message of messages) {
      if (message.isAiGenerated) {
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

    // Simulador: rota para sendSimulatorMessage em vez de sendMessage real
    if (isSimulator) {
      if (!trimmed || mutations.sendSimulatorMessage.isPending) return
      mutations.sendSimulatorMessage.mutate(
        { conversationId: conversation.id, text: trimmed },
        {
          onSuccess: () => {
            setText('')
            chatInputRef.current?.focus()
          },
          onError: () => toast.error('Erro ao enviar mensagem para o simulador'),
        },
      )
      return
    }

    if (!trimmed || mutations.sendMessage.isPending) return
    mutations.sendMessage.mutate(
      { conversationId: conversation.id, text: trimmed },
      {
        onSuccess: (result) => {
          setText('')
          chatInputRef.current?.focus()
          if (result?.data?.sendFailed) {
            toast.error(result.data.errorMessage ?? 'Falha no envio. Verifique no chat.')
          }
        },
        onError: () => toast.error('Erro ao enviar mensagem'),
      },
    )
  }

  const handleToggleAi = (checked: boolean) => {
    const newPaused = !checked
    onToggleAiPause?.(conversation.id, newPaused)
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
    if (!selectedFile || mutations.sendMedia.isPending) return

    try {
      const reader = new FileReader()
      reader.onerror = () => {
        toast.error('Erro ao ler o arquivo.')
      }
      reader.onloadend = () => {
        const fileDataUrl = reader.result as string
        const base64 = fileDataUrl.split(',')[1]
        if (!base64) {
          toast.error('Erro ao processar arquivo.')
          return
        }
        mutations.sendMedia.mutate(
          {
            conversationId: conversation.id,
            mediaBase64: base64,
            mimetype: selectedFile.type,
            fileName: selectedFile.name,
            caption: text.trim() || undefined,
          },
          {
            onSuccess: (result) => {
              handleFileRemove()
              setText('')
              chatInputRef.current?.focus()
              if (result?.data?.sendFailed) {
                toast.error(result.data.errorMessage ?? 'Falha no envio do arquivo. Verifique no chat.')
              }
            },
            onError: () => toast.error('Erro ao enviar arquivo'),
          },
        )
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
          isTogglePending={false}
          onToggleAi={handleToggleAi}
          onOpenSettings={() => setSettingsOpen(true)}
          assigneeName={conversation.assigneeName}
          onBack={onBack}
          conversationStatus={conversation.status}
          isStatusPending={false}
          onResolve={() => onStatusChange?.(conversation.id, 'RESOLVED')}
          onReopen={() => onStatusChange?.(conversation.id, 'OPEN')}
          windowState={windowState}
          isSimulator={isSimulator}
          onResetSimulator={
            isSimulator
              ? () =>
                  mutations.resetSimulator.mutate(conversation.id, {
                    onSuccess: () => toast.success('Simulação reiniciada.'),
                    onError: () => toast.error('Erro ao reiniciar simulação.'),
                  })
              : undefined
          }
          onEndSimulator={
            isSimulator
              ? () =>
                  mutations.endSimulator.mutate(conversation.id, {
                    onSuccess: () => {
                      toast.success('Simulação encerrada.')
                      onSimulatorEnded?.()
                    },
                    onError: () => toast.error('Erro ao encerrar simulação.'),
                  })
              : undefined
          }
          isSimulatorActionPending={
            mutations.resetSimulator.isPending || mutations.endSimulator.isPending
          }
        />
        <ChatBanners
          connectionError={connectionError}
          aiPaused={aiPaused}
          isSimulator={isSimulator}
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
        {/* Indicador de digitação do agente — visível enquanto a IA processa */}
        {getAgentStatus && (
          <AgentTypingIndicator
            conversationId={conversation.id}
            getStatus={getAgentStatus}
          />
        )}
        <ChatInput
          ref={chatInputRef}
          text={text}
          onTextChange={setText}
          onSend={handleSend}
          isSendPending={isSimulator ? mutations.sendSimulatorMessage.isPending : mutations.sendMessage.isPending}
          // Simulador não suporta áudio — esconde o controle de gravação
          isAudioPending={isSimulator ? false : mutations.sendAudio.isPending}
          isRecording={isSimulator ? false : isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={isSimulator ? () => {} : startRecording}
          onStopRecording={isSimulator ? () => {} : stopRecording}
          onCancelRecording={isSimulator ? () => {} : cancelRecording}
          // Simulador não suporta anexos — esconde o controle de arquivo
          selectedFile={isSimulator ? null : selectedFile}
          mediaPreviewUrl={isSimulator ? null : mediaPreviewUrl}
          onFileSelect={isSimulator ? () => {} : handleFileSelect}
          onFileRemove={isSimulator ? () => {} : handleFileRemove}
          onSendMedia={isSimulator ? () => {} : handleSendMedia}
          isMediaPending={isSimulator ? false : mutations.sendMedia.isPending}
          // Simulador não usa templates Meta
          onOpenTemplateDialog={isMetaCloud && !isSimulator ? () => setTemplateDialogOpen(true) : undefined}
          windowClosed={isSimulator ? false : isWindowClosed}
          placeholder={isSimulator ? 'Digite uma mensagem para o agente...' : undefined}
        />
        {isMetaCloud && (
          <TemplateMessageDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            conversationId={conversation.id}
            inboxId={conversation.inboxId}
            orgSlug={orgSlug}
            onSent={() => {
              queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(conversation.id) })
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
          onToggleLabel={(id, labelId) => mutations.toggleLabel.mutate({ conversationId: id, labelId })}
        />
      </div>
    </TooltipProvider>
  )
}
