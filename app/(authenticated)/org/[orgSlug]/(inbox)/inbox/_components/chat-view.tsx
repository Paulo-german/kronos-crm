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
import type {
  ConversationListDto,
  ConversationLabelDto,
} from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { useInboxMessages } from '../_hooks/use-inbox-messages'
import { useInboxMutations } from '../_hooks/use-inbox-mutations'
import { inboxKeys } from '../_lib/inbox-query-keys'
import { useAudioRecorder } from '../_hooks/use-audio-recorder'
import { useConversationWindow } from '../_hooks/use-conversation-window'
import { useChannelConnectionStatus } from '../_hooks/use-channel-connection-status'
import {
  IG_CONVERSATION_WINDOW_MS,
  IG_HUMAN_AGENT_WINDOW_MS,
} from '@/_lib/instagram/constants'
import { ChatHeader } from './chat-header'
import { ChatBanners } from './chat-banners'
import { ChatMessageList } from './chat-message-list'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ChatSettingsSheet } from './chat-settings-sheet'
import { TemplateMessageDialog } from './template-message-dialog'
import { ConversationWindowBanner } from './conversation-window-banner'
import { InstagramWindowBanner } from './instagram-window-banner'
import { AgentTypingIndicator } from './agent-typing-indicator'
import { SimulatorDebugSheet } from './simulator-debug-sheet'
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
  /** Reinicia a simulação selecionando a conversa nova que a action recria. */
  onSimulatorReset?: (conversation: ConversationListDto) => void
  /** Função de lookup do Map de status do agente — injetada pelo InboxClient */
  getAgentStatus?: (conversationId: string) => AgentStatusPayload | null
}

export function ChatView({
  conversation,
  dealOptions,
  contactOptions,
  orgSlug,
  members,
  isElevated,
  availableLabels,
  onToggleAiPause,
  onStatusChange,
  onBack,
  onSimulatorEnded,
  onSimulatorReset,
  getAgentStatus,
}: ChatViewProps) {
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(
    null,
  )
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  // Controla se o envio para Instagram usará a tag HUMAN_AGENT (janela 24h–7d)
  const [useHumanAgentTag, setUseHumanAgentTag] = useState(true)

  const queryClient = useQueryClient()

  const isMetaCloud = conversation.inboxConnectionType === 'META_CLOUD'
  const isInstagramDm = conversation.channel === 'INSTAGRAM_DM'
  // Simulador: usa pipeline diferente de envio, esconde controles específicos de WhatsApp
  const isSimulator = conversation.inboxConnectionType === 'SIMULATOR'

  // Inboxes suportados para edição de mensagem (Meta Cloud e Instagram não suportam)
  const canEditMessages =
    (conversation.inboxConnectionType === 'EVOLUTION' ||
      conversation.inboxConnectionType === 'Z_API') &&
    conversation.channel !== 'INSTAGRAM_DM'

  // Lógica de janela de tempo para Instagram Direct
  const instagramElapsed =
    isInstagramDm && conversation.lastCustomerMessageAt
      ? Date.now() - new Date(conversation.lastCustomerMessageAt).getTime()
      : null
  const isInstagramWithin24h =
    instagramElapsed !== null && instagramElapsed < IG_CONVERSATION_WINDOW_MS
  const isInstagramWithin7d =
    instagramElapsed !== null && instagramElapsed < IG_HUMAN_AGENT_WINDOW_MS
  // Sem mensagem do cliente → trata como fora da janela (bloqueado)
  const isInstagramBlocked =
    isInstagramDm &&
    (conversation.lastCustomerMessageAt === null || !isInstagramWithin7d)
  const mediaPreviewUrlRef = useRef<string | null>(null)

  const windowState = useConversationWindow(
    conversation.lastCustomerMessageAt
      ? new Date(conversation.lastCustomerMessageAt)
      : null,
    conversation.inboxConnectionType,
  )
  const { disconnected: channelDisconnected } = useChannelConnectionStatus(
    conversation.inboxId,
    conversation.inboxConnectionType,
  )
  const isWindowClosed =
    (windowState.isMetaCloud && !windowState.isOpen) || isInstagramBlocked
  const chatInputRef = useRef<ChatInputHandle>(null)

  useEffect(() => {
    chatInputRef.current?.focus()
  }, [])

  // Limpar arquivo selecionado ao trocar de conversa
  useEffect(() => {
    if (mediaPreviewUrlRef.current)
      URL.revokeObjectURL(mediaPreviewUrlRef.current)
    setSelectedFile(null)
    setMediaPreviewUrl(null)
    mediaPreviewUrlRef.current = null
  }, [conversation.id])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (mediaPreviewUrlRef.current)
        URL.revokeObjectURL(mediaPreviewUrlRef.current)
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

  const handleEditMessage = (
    messageId: string,
    conversationId: string,
    newText: string,
  ) => {
    setEditingMessageId(messageId)
    mutations.editMessage.mutate(
      { messageId, conversationId, newText },
      {
        onSuccess: (result) => {
          setEditingMessageId(null)
          if (result?.data?.success === false) {
            toast.error(
              result.data.errorMessage ?? 'Não foi possível editar a mensagem.',
            )
            return
          }
          toast.success('Mensagem editada.')
        },
        onError: () => {
          setEditingMessageId(null)
          toast.error('Erro ao editar mensagem.')
        },
      },
    )
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
        onError: (error) => {
          setRetryingMessageId(null)
          toast.error(error.message || 'Erro ao reenviar mensagem.')
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
              toast.error(
                result.data.errorMessage ??
                  'Falha no envio do áudio. Verifique no chat.',
              )
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
      (itemA, itemB) =>
        new Date(itemA.data.createdAt).getTime() -
        new Date(itemB.data.createdAt).getTime(),
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
          onError: () =>
            toast.error('Erro ao enviar mensagem para o simulador'),
        },
      )
      return
    }

    if (!trimmed || mutations.sendMessage.isPending) return
    mutations.sendMessage.mutate(
      {
        conversationId: conversation.id,
        text: trimmed,
        // Para Instagram fora da janela de 24h, inclui a tag human_agent se habilitada pelo usuário
        ...(isInstagramDm && !isInstagramWithin24h && { useHumanAgentTag }),
      },
      {
        onSuccess: (result) => {
          setText('')
          chatInputRef.current?.focus()
          if (result?.data?.sendFailed) {
            toast.error(
              result.data.errorMessage ?? 'Falha no envio. Verifique no chat.',
            )
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
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null
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
                toast.error(
                  result.data.errorMessage ??
                    'Falha no envio do arquivo. Verifique no chat.',
                )
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
          conversationId={conversation.id}
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
          channelDisconnected={channelDisconnected}
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
                    onSuccess: (result) => {
                      // A action recria a conversa com novo ID — seleciona ela,
                      // senão a UI fica presa na conversa que acabou de ser deletada.
                      const newConversation = result?.data?.conversation
                      if (!newConversation) {
                        toast.error('Erro ao reiniciar simulação.')
                        return
                      }
                      toast.success('Simulação reiniciada.')
                      onSimulatorReset?.(newConversation)
                    },
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
            mutations.resetSimulator.isPending ||
            mutations.endSimulator.isPending
          }
          onOpenDebug={isSimulator ? () => setDebugOpen(true) : undefined}
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
          canEditMessages={canEditMessages}
          onEditMessage={handleEditMessage}
          editingMessageId={editingMessageId}
        />
        <Separator />
        <ConversationWindowBanner
          windowState={windowState}
          onOpenTemplateDialog={() => setTemplateDialogOpen(true)}
        />
        {/* Banner de janela de tempo para Instagram Direct */}
        {isInstagramDm && !isSimulator && (
          <InstagramWindowBanner
            isWithin24h={isInstagramWithin24h}
            isWithin7d={isInstagramWithin7d}
            useHumanAgentTag={useHumanAgentTag}
            onHumanAgentTagChange={setUseHumanAgentTag}
          />
        )}
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
          isSendPending={
            isSimulator
              ? mutations.sendSimulatorMessage.isPending
              : mutations.sendMessage.isPending
          }
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
          onOpenTemplateDialog={
            isMetaCloud && !isSimulator
              ? () => setTemplateDialogOpen(true)
              : undefined
          }
          windowClosed={isSimulator ? false : isWindowClosed}
          placeholder={
            isSimulator
              ? 'Digite uma mensagem para o agente...'
              : isInstagramBlocked
                ? 'Aguardando nova mensagem do cliente para reabrir a conversa.'
                : undefined
          }
        />
        {isMetaCloud && (
          <TemplateMessageDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            conversationId={conversation.id}
            inboxId={conversation.inboxId}
            orgSlug={orgSlug}
            onSent={() => {
              queryClient.invalidateQueries({
                queryKey: inboxKeys.messages.byConversation(conversation.id),
              })
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
        />

        {isSimulator && (
          <SimulatorDebugSheet
            conversationId={conversation.id}
            open={debugOpen}
            onOpenChange={setDebugOpen}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
